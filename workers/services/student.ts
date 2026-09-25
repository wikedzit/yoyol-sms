import {
  and,
  asc,
  desc,
  eq,
  like,
} from 'drizzle-orm';
import { z } from 'zod';

import {
  students,
  type InsertStudent,
  type SelectStudent,
} from '../database/students';

import { campus } from '../database/campuses';
import { school } from '../database/school';

import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';

// ------------------------------------------------
// Zod schemas
// ------------------------------------------------

const CreateStudentSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100),

  gender: z
    .string()
    .transform((value) => (value ? value.trim() : value))
    .refine(
      (value) =>
        !value ||
        ['Male', 'Female'].includes(capitalize(value)),
      {
        message: 'Invalid gender',
      },
    )
    .default('Male'),

  dob: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === ''
        ? undefined
        : value,
    z.string().optional(),
  ),

  email: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === ''
        ? undefined
        : value,
    z.string().email().optional(),
  ),

  phone: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === ''
        ? undefined
        : value,
    z.string().optional(),
  ),

  address: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === ''
        ? undefined
        : value,
    z.string().optional(),
  ),

  guardianName: z.string().optional(),

  guardianPhone: z.string().optional(),

  photoUrl: z.string().optional(),

  course: z.string().optional(),

  grade: z.string().optional(),

  enrollmentDate: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === ''
        ? undefined
        : value,
    z.string().optional(),
  ),

  admissionNumber: z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value;
      }

      const trimmed = value.trim();

      return trimmed.length > 0
        ? trimmed
        : undefined;
    },
    z
      .string()
      .max(50)
      .optional(),
  ),

  // Legacy class reference
  classId: z.preprocess(
    (value) =>
      value ? Number(value) : undefined,
    z.number().optional(),
  ),

  // School-based form/class reference
  formClassId: z.preprocess(
    (value) =>
      value ? Number(value) : undefined,
    z.number().optional(),
  ),

  // Optional campus reference
  campusId: z.preprocess(
    (value) =>
      value ? Number(value) : undefined,
    z.number().optional(),
  ),

  status: z
    .enum([
      'Active',
      'Pending',
      'Inactive',
    ])
    .default('Active'),
});

const UpdateStudentSchema =
  CreateStudentSchema.partial();

const GetStudentsSchema = z
  .object({
    limit: z
      .number()
      .min(1)
      .max(100)
      .default(50),

    offset: z
      .number()
      .min(0)
      .default(0),

    sortBy: z
      .enum([
        'firstName',
        'lastName',
        'createdAt',
        'updatedAt',
      ])
      .default('createdAt'),

    sortOrder: z
      .enum(['asc', 'desc'])
      .default('asc'),

    search: z.string().optional(),
  })
  .optional();

// ------------------------------------------------
// TypeScript types
// ------------------------------------------------

export type CreateStudentInput =
  z.infer<typeof CreateStudentSchema>;

export type UpdateStudentInput =
  z.infer<typeof UpdateStudentSchema>;

export type GetStudentsInput =
  z.infer<typeof GetStudentsSchema>;

// ------------------------------------------------
// Student service
// ------------------------------------------------

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
          return null;
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

      return null;
    }
  }

  // ------------------------------------------------
  // Get student by ID
  // ------------------------------------------------

  async getById(
    id: string,
  ): Promise<SelectStudent | null> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const result =
        await this.db
          .select()
          .from(students)
          .where(
            and(
              eq(
                students.id,
                Number(id),
              ),
              eq(
                students.ownerUserId,
                ownerUserId,
              ),
            ),
          )
          .get();

      return result || null;
    } catch (error) {
      console.error(
        'Error fetching student:',
        error,
      );

      return null;
    }
  }

  // ------------------------------------------------
  // Get student by admission number
  // ------------------------------------------------

  async findByAdmissionNumber(
    admissionNumber: string,
  ): Promise<SelectStudent | null> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const result =
        await this.db
          .select()
          .from(students)
          .where(
            and(
              eq(
                students.admissionNumber,
                admissionNumber,
              ),
              eq(
                students.ownerUserId,
                ownerUserId,
              ),
            ),
          )
          .get();

      return result || null;
    } catch (error) {
      console.error(
        'Error fetching student by admission number:',
        error,
      );

      return null;
    }
  }

  // ------------------------------------------------
  // Get student by email
  // ------------------------------------------------

  async getByEmail(
    email: string,
  ): Promise<SelectStudent | null> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const result =
        await this.db
          .select()
          .from(students)
          .where(
            and(
              eq(
                students.email,
                email,
              ),
              eq(
                students.ownerUserId,
                ownerUserId,
              ),
            ),
          )
          .get();

      return result || null;
    } catch (error) {
      console.error(
        'Error fetching student by email:',
        error,
      );

      return null;
    }
  }

  // ------------------------------------------------
  // Get all students
  // ------------------------------------------------

  async getAll(
    options?: GetStudentsInput,
  ): Promise<SelectStudent[]> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const parsed =
        GetStudentsSchema.parse(
          options ?? {},
        );

      const {
        limit = 50,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'asc',
        search,
      } = parsed ?? {};

      const sortColumn =
        sortBy === 'firstName'
          ? students.firstName
          : sortBy === 'lastName'
            ? students.lastName
            : sortBy === 'createdAt'
              ? students.createdAt
              : students.updatedAt;

      const filters = [
        eq(
          students.ownerUserId,
          ownerUserId,
        ),
      ];

      if (search) {
        filters.push(
          like(
            students.firstName,
            `%${search}%`,
          ),
        );
      }

      return await this.db
        .select()
        .from(students)
        .where(
          and(...filters),
        )
        .orderBy(
          sortOrder === 'asc'
            ? asc(sortColumn)
            : desc(sortColumn),
        )
        .limit(limit)
        .offset(offset);
    } catch (error) {
      console.error(
        'Error fetching students:',
        error,
      );

      return [];
    }
  }

  // ------------------------------------------------
  // Update student
  // ------------------------------------------------

  async update(
    id: string,
    data: UpdateStudentInput,
  ): Promise<SelectStudent | null> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const validated =
        UpdateStudentSchema.parse(data);

      // If campus is being changed, make sure
      // the new campus belongs to this owner.
      if (
        validated.campusId !== undefined &&
        validated.campusId !== null
      ) {
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
          return null;
        }
      }

      // If admission number is being changed,
      // make sure it is not already used.
      if (
        validated.admissionNumber
      ) {
        const existingAdmission =
          await this.findByAdmissionNumber(
            validated.admissionNumber,
          );

        if (
          existingAdmission &&
          existingAdmission.id !==
            Number(id)
        ) {
          throw new Error(
            'This admission number is already in use.',
          );
        }
      }

      const updateValues: Partial<InsertStudent> =
        {
          ...validated,
          updatedAt: Date.now(),
        };

      const result =
        await this.db
          .update(students)
          .set(updateValues)
          .where(
            and(
              eq(
                students.id,
                Number(id),
              ),
              eq(
                students.ownerUserId,
                ownerUserId,
              ),
            ),
          )
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
        'Error updating student:',
        error,
      );

      return null;
    }
  }

  // ------------------------------------------------
  // Delete student
  // ------------------------------------------------

  async delete(
    id: string,
  ): Promise<boolean> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const result =
        await this.db
          .delete(students)
          .where(
            and(
              eq(
                students.id,
                Number(id),
              ),
              eq(
                students.ownerUserId,
                ownerUserId,
              ),
            ),
          )
          .returning({
            id: students.id,
          });

      return result.length > 0;
    } catch (error) {
      console.error(
        'Error deleting student:',
        error,
      );

      return false;
    }
  }

  // ------------------------------------------------
  // Get students by form class
  // ------------------------------------------------

  async getByFormClassId(
    formClassId: number,
  ): Promise<SelectStudent[]> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      return await this.db
        .select()
        .from(students)
        .where(
          and(
            eq(
              students.formClassId,
              formClassId,
            ),
            eq(
              students.ownerUserId,
              ownerUserId,
            ),
          ),
        )
        .orderBy(
          asc(students.firstName),
          asc(students.lastName),
        );
    } catch (error) {
      console.error(
        'Error fetching students by formClassId:',
        error,
      );

      return [];
    }
  }

  // ------------------------------------------------
  // Count students by form class
  // ------------------------------------------------

  async countByFormClassId(
    formClassId: number,
  ): Promise<number> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const result =
        await this.db
          .select()
          .from(students)
          .where(
            and(
              eq(
                students.formClassId,
                formClassId,
              ),
              eq(
                students.ownerUserId,
                ownerUserId,
              ),
            ),
          );

      return result.length;
    } catch (error) {
      console.error(
        'Error counting students by formClassId:',
        error,
      );

      return 0;
    }
  }

  // ------------------------------------------------
  // Count all students
  // ------------------------------------------------

  async countAll(): Promise<number> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const result =
        await this.db
          .select()
          .from(students)
          .where(
            eq(
              students.ownerUserId,
              ownerUserId,
            ),
          );

      return result.length;
    } catch (error) {
      console.error(
        'Error counting students:',
        error,
      );

      return 0;
    }
  }

  // ------------------------------------------------
  // Get students by campus
  // ------------------------------------------------

  async getByCampusId(
    campusId: number,
  ): Promise<SelectStudent[]> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      return await this.db
        .select()
        .from(students)
        .where(
          and(
            eq(
              students.campusId,
              campusId,
            ),
            eq(
              students.ownerUserId,
              ownerUserId,
            ),
          ),
        )
        .orderBy(
          asc(students.firstName),
          asc(students.lastName),
        );
    } catch (error) {
      console.error(
        'Error fetching students by campusId:',
        error,
      );

      return [];
    }
  }

  // ------------------------------------------------
  // Count students by campus
  // ------------------------------------------------

  async countByCampusId(
    campusId: number,
  ): Promise<number> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const result =
        await this.db
          .select()
          .from(students)
          .where(
            and(
              eq(
                students.campusId,
                campusId,
              ),
              eq(
                students.ownerUserId,
                ownerUserId,
              ),
            ),
          );

      return result.length;
    } catch (error) {
      console.error(
        'Error counting students by campusId:',
        error,
      );

      return 0;
    }
  }
}

// ------------------------------------------------
// Helpers
// ------------------------------------------------

function capitalize(
  value: string,
): string {
  if (!value) {
    return value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  const lower =
    trimmed.toLowerCase();

  return (
    lower.charAt(0).toUpperCase() +
    lower.slice(1)
  );
}