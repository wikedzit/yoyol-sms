import { and, eq, desc, asc, like } from 'drizzle-orm';
import { z } from 'zod';
import {
  students,
  type InsertStudent,
  type SelectStudent,
} from '../database/students';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type SchoolAccess from './school-access';

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
    private schoolAccess: SchoolAccess,
  ) {}

  private async schoolFor(permissionKey: string): Promise<number | null> {
    const schoolId = await this.schoolAccess.currentSchoolId();
    if (schoolId == null) {
      return null;
    }

    const allowed = await this.schoolAccess.can(permissionKey, schoolId);
    if (!allowed) {
      return null;
    }

    return schoolId;
  }

  async create(data: CreateStudentInput): Promise<SelectStudent | null> {
    try {
      const schoolId = await this.schoolFor('students.student.create');
      if (schoolId == null) {
        return null;
      }

      const validated = CreateStudentSchema.parse(data);
      if (validated.schoolId != null && validated.schoolId !== schoolId) {
        return null;
      }

      const result = await this.db
        .insert(students)
        .values({
          ...validated,
          schoolId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      const created = result[0] || null;
      if (created && validated.guardianName?.trim()) {
        await this.schoolAccess.recordStudentGuardian({
          schoolId,
          studentId: created.id,
          guardianName: validated.guardianName,
          phone: validated.guardianPhone,
        });
      }

      return created;
    } catch (error) {
      console.error('Error creating student:', error);
      return null;
    }
  }

  async getById(id: string): Promise<SelectStudent | null> {
    try {
      const schoolId = await this.schoolFor('students.student.read');
      if (schoolId == null) {
        return null;
      }
      const result = await this.db
        .select()
        .from(students)
        .where(
          and(eq(students.id, Number(id)), eq(students.schoolId, schoolId)),
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
      const schoolId = await this.schoolFor('students.student.read');
      if (schoolId == null) {
        return null;
      }
      const result = await this.db
        .select()
        .from(students)
        .where(
          and(eq(students.email, email), eq(students.schoolId, schoolId)),
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
      const schoolId = await this.schoolFor('students.student.read');
      if (schoolId == null) {
        return [];
      }
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

      const filters = [eq(students.schoolId, schoolId)];
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
      const schoolId = await this.schoolFor('students.student.update');
      if (schoolId == null) {
        return null;
      }
      const validated = UpdateStudentSchema.parse(data);
      const updateValues: Partial<InsertStudent> = {
        ...validated,
        updatedAt: Date.now(),
      };

      const result = await this.db
        .update(students)
        .set(updateValues)
        .where(
          and(eq(students.id, Number(id)), eq(students.schoolId, schoolId)),
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
      const schoolId = await this.schoolFor('students.student.delete');
      if (schoolId == null) {
        return false;
      }
      const result = await this.db
        .delete(students)
        .where(
          and(eq(students.id, Number(id)), eq(students.schoolId, schoolId)),
        )
        .returning({ id: students.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting student:', error);
      return false;
    }
  }

  async getByFormClassId(formClassId: number): Promise<SelectStudent[]> {
    try {
      const schoolId = await this.schoolFor('students.student.read');
      if (schoolId == null) {
        return [];
      }
      return await this.db
        .select()
        .from(students)
        .where(
          and(
            eq(students.formClassId, formClassId),
            eq(students.schoolId, schoolId),
          ),
        )
        .orderBy(asc(students.firstName), asc(students.lastName));
    } catch (error) {
      console.error('Error fetching students by formClassId:', error);
      return [];
    }
  }

  async countByFormClassId(formClassId: number): Promise<number> {
    try {
      const schoolId = await this.schoolFor('students.student.read');
      if (schoolId == null) {
        return 0;
      }
      const result = await this.db
        .select()
        .from(students)
        .where(
          and(
            eq(students.formClassId, formClassId),
            eq(students.schoolId, schoolId),
          ),
        );
      return result.length;
    } catch (error) {
      console.error('Error counting students by formClassId:', error);
      return 0;
    }
  }

  async countAll(): Promise<number> {
    try {
      const schoolId = await this.schoolFor('students.student.read');
      if (schoolId == null) {
        return 0;
      }
      const result = await this.db
        .select()
        .from(students)
        .where(eq(students.schoolId, schoolId));
      return result.length;
    } catch (error) {
      console.error('Error counting students:', error);
      return 0;
    }
  }

  async getBySchoolId(requestedSchoolId: number): Promise<SelectStudent[]> {
    try {
      const isMember = await this.schoolAccess.isMemberOf(requestedSchoolId);
      const allowed = await this.schoolAccess.can(
        'students.student.read',
        requestedSchoolId,
      );
      if (!isMember || !allowed) {
        return [];
      }

      return await this.db
        .select()
        .from(students)
        .where(eq(students.schoolId, requestedSchoolId))
        .orderBy(asc(students.firstName), asc(students.lastName));
    } catch (error) {
      console.error('Error fetching students by schoolId:', error);
      return [];
    }
  }

  async countBySchoolId(requestedSchoolId: number): Promise<number> {
    try {
      const isMember = await this.schoolAccess.isMemberOf(requestedSchoolId);
      const allowed = await this.schoolAccess.can(
        'students.student.read',
        requestedSchoolId,
      );
      if (!isMember || !allowed) {
        return 0;
      }

      const result = await this.db
        .select()
        .from(students)
        .where(eq(students.schoolId, requestedSchoolId));
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