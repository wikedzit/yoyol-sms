import { and, eq, desc, asc, like } from 'drizzle-orm';
import { z } from 'zod';
import {
  students,
  type InsertStudent,
  type SelectStudent,
} from '../database/students';
import { school } from '../database/school';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';

// --- Zod schemas for validation ---
const CreateStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  gender: z
    .string()
    .transform((s) => (s ? s.trim() : s))
    .refine((s) => !s || ['Male', 'Female'].includes(capitalize(s)), {
      message: 'Invalid gender',
    })
    .default('Select gender'),
  dob: z.string().optional(), // YYYY-MM-DD
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  photoUrl: z.string().optional(),
  course: z.string().optional(),
  grade: z.string().optional(),
  enrollmentDate: z.string().optional(), // YYYY-MM-DD
  // Legacy: old university-style class reference
  classId: z.preprocess(
    (v) => (v ? Number(v) : undefined),
    z.number().optional()
  ),
  // New: school-style formClass reference (O-Level/A-Level structure)
  formClassId: z.preprocess(
    (v) => (v ? Number(v) : undefined),
    z.number().optional()
  ),
  // Which school this student belongs to — OPTIONAL, since students added
  // via the O-Level/A-Level formClass flow have no school relationship
  schoolId: z.preprocess(
    (v) => (v ? Number(v) : undefined),
    z.number().optional()
  ),
  status: z.enum(['Active', 'Pending', 'Inactive']).default('Active'),
});

const UpdateStudentSchema = CreateStudentSchema.partial();

const GetStudentsSchema = z
  .object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
    sortBy: z
      .enum(['firstName', 'lastName', 'createdAt', 'updatedAt'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
    search: z.string().optional(),
  })
  .optional();

// --- TypeScript types ---
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;
export type GetStudentsInput = z.infer<typeof GetStudentsSchema>;

// --- Student service class ---
export default class StudentService {
  constructor(
    private db: DrizzleD1Database,
    private ownerUserId: number | null,
  ) {}

  // ------------------------------------------------
  // Create student
  // ------------------------------------------------

  async create(
    data: CreateStudentInput,
  ): Promise<SelectStudent | null> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const validated =
        CreateStudentSchema.parse(data);

      // Verify that the selected campus belongs
      // to a school owned by the current user (if specified).
      if (validated.campusId) {
        const ownedCampus =
          await this.db
            .select({
              id: campus.id,
            })
            .from(campus)
            .innerJoin(
              school,
              eq(
                campus.schoolId,
                school.id,
              ),
            )
            .where(
              and(
                eq(
                  campus.id,
                  validated.campusId,
                ),
                eq(
                  school.ownerUserId,
                  ownerUserId,
                ),
              ),
            )
            .get();

        if (!ownedCampus) {
          throw new Error(
            'Selected campus was not found.',
          );
        }
      }

      // Prevent duplicate admission numbers
      // for the same owner.
      if (validated.admissionNumber) {
        const existingAdmission =
          await this.findByAdmissionNumber(
            validated.admissionNumber,
          );

        if (existingAdmission) {
          throw new Error(
            'This admission number is already in use.',
          );
        }
      }

      const now = Date.now();

      const result =
        await this.db
          .insert(students)
          .values({
            ...validated,
            ownerUserId,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

      return result[0] || null;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          'This admission number is already in use.'
      ) {
        throw error;
      }

      console.error(
        'Error creating student:',
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Failed to add student.';

      throw new Error(message);
    }
  }

  async create(data: CreateStudentInput): Promise<SelectStudent | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const validated = CreateStudentSchema.parse(data);

      // Only check school ownership if a schoolId was actually provided.
      // Students added through the formClass (O-Level/A-Level) flow have
      // no schoolId at all, so this check simply doesn't apply to them.
      if (validated.schoolId) {
        const ownedSchool = await this.db
          .select({ id: school.id })
          .from(school)
          .where(
            and(
              eq(school.id, validated.schoolId),
              eq(school.ownerUserId, ownerUserId),
            ),
          )
          .get();

        if (!ownedSchool) {
          return null;
        }
      }

      const result = await this.db
        .insert(students)
        .values({
          ...validated,
          ownerUserId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error creating student:', error);
      return null;
    }
  }

  async getById(id: string): Promise<SelectStudent | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(students)
        .where(
          and(eq(students.id, Number(id)), eq(students.ownerUserId, ownerUserId)),
        )
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching student:', error);
      return null;
    }
  }

  async getByEmail(email: string): Promise<SelectStudent | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(students)
        .where(
          and(eq(students.email, email), eq(students.ownerUserId, ownerUserId)),
        )
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching student by email:', error);
      return null;
    }
  }

  async getAll(options: GetStudentsInput): Promise<SelectStudent[]> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const { limit, offset, sortBy, sortOrder, search } =
        GetStudentsSchema.parse(options) ?? {};

      const sortColumn =
        sortBy === 'firstName'
          ? students.firstName
          : sortBy === 'lastName'
          ? students.lastName
          : sortBy === 'createdAt'
          ? students.createdAt
          : students.updatedAt;

      const filters = [eq(students.ownerUserId, ownerUserId)];
      if (search) {
        filters.push(like(students.firstName, `%${search}%`));
      }

      return await this.db
        .select()
        .from(students)
        .where(and(...filters))
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit ?? 10)
        .offset(offset ?? 0);
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  }

  async update(
    id: string,
    data: UpdateStudentInput
  ): Promise<SelectStudent | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const validated = UpdateStudentSchema.parse(data);
      const updateValues: Partial<InsertStudent> = {
        ...validated,
        updatedAt: Date.now(),
      };

      const result = await this.db
        .update(students)
        .set(updateValues)
        .where(
          and(eq(students.id, Number(id)), eq(students.ownerUserId, ownerUserId)),
        )
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating student:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .delete(students)
        .where(
          and(eq(students.id, Number(id)), eq(students.ownerUserId, ownerUserId)),
        )
        .returning({ id: students.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting student:', error);
      return false;
    }
  }

  /**
   * Get students by formClassId (school structure: O-Level/A-Level)
   */
  async getByFormClassId(formClassId: number): Promise<SelectStudent[]> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      return await this.db
        .select()
        .from(students)
        .where(
          and(
            eq(students.formClassId, formClassId),
            eq(students.ownerUserId, ownerUserId),
          ),
        )
        .orderBy(asc(students.firstName), asc(students.lastName));
    } catch (error) {
      console.error('Error fetching students by formClassId:', error);
      return [];
    }
  }

  /**
   * Count students in a formClass
   */
  async countByFormClassId(formClassId: number): Promise<number> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(students)
        .where(
          and(
            eq(students.formClassId, formClassId),
            eq(students.ownerUserId, ownerUserId),
          ),
        );
      return result.length;
    } catch (error) {
      console.error('Error counting students by formClassId:', error);
      return 0;
    }
  }

  /**
   * Count students owned by the signed-in user
   */
  async countAll(): Promise<number> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(students)
        .where(eq(students.ownerUserId, ownerUserId));
      return result.length;
    } catch (error) {
      console.error('Error counting students:', error);
      return 0;
    }
  }

  /**
   * Wanafunzi wa shule maalum (kwa School Detail page)
   */
  async getBySchoolId(schoolId: number): Promise<SelectStudent[]> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      return await this.db
        .select()
        .from(students)
        .where(
          and(
            eq(students.schoolId, schoolId),
            eq(students.ownerUserId, ownerUserId),
          ),
        )
        .orderBy(asc(students.firstName), asc(students.lastName));
    } catch (error) {
      console.error('Error fetching students by schoolId:', error);
      return [];
    }
  }

  /**
   * Idadi ya wanafunzi wa shule maalum (kwa Stats card kwenye School Detail)
   */
  async countBySchoolId(schoolId: number): Promise<number> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(students)
        .where(
          and(
            eq(students.schoolId, schoolId),
            eq(students.ownerUserId, ownerUserId),
          ),
        );
      return result.length;
    } catch (error) {
      console.error('Error counting students by schoolId:', error);
      return 0;
    }
  }
}

function capitalize(s: string): string {
  if (!s) return s;
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}