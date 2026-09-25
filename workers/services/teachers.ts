import { and, eq, like, asc, desc } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { teachers, type SelectTeacher } from 'workers/database';
import { campus } from 'workers/database/campuses';
import { school } from 'workers/database/school';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';

import { z } from 'zod';

// --- Zod Schemas ---
const CreateTeacherSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  subject: z.string().max(100).optional().default(''),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  qualification: z.string().optional(),
  gender: z.string().min(1, 'Gender is required').max(10),
  experience: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);

      return isNaN(num)
        ? undefined
        : num;
    },
    z
      .number()
      .min(0)
      .optional(),
  ),

  status: z
    .enum([
      'Active',
      'Inactive',
    ])
    .default('Active'),

  // NEW:
  // Teacher belongs to a campus.
  campusId: z.preprocess(
    (v) => (
      v
        ? Number(v)
        : undefined
    ),
    z.number({
      required_error:
        'Please select a campus',
    }),
  ),
});

const UpdateTeacherSchema = CreateTeacherSchema.partial();

const GetTeachersSchema =
  z.object({
    limit: z
      .number()
      .min(1)
      .max(100)
      .default(50)
      .optional(),

    offset: z
      .number()
      .min(0)
      .default(0)
      .optional(),

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

    search: z
      .string()
      .optional(),
  });

export type CreateTeacherInput =
  z.infer<
    typeof CreateTeacherSchema
  >;

export type UpdateTeacherInput =
  z.infer<
    typeof UpdateTeacherSchema
  >;

export type GetTeachersInput =
  z.infer<
    typeof GetTeachersSchema
  >;

// --------------------------------------------------
// Teacher Service
// --------------------------------------------------

export default class TeacherService {
  constructor(
    private db: DrizzleD1Database,
    private ownerUserId: number | null,
  ) {}

  // ------------------------------------------------
  // Create teacher
  // ------------------------------------------------

  async createTeacher(
    data: CreateTeacherInput,
  ): Promise<SelectTeacher | null> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const validatedData =
        CreateTeacherSchema.parse(
          data,
        );

      // Verify campus belongs to a school
      // owned by this user.
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
                validatedData.campusId,
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

      const result =
        await this.db
          .insert(teachers)
          .values({
            firstName:
              validatedData.firstName,

            lastName:
              validatedData.lastName,

            subject:
              validatedData.subject,

            email:
              validatedData.email ?? '',

            phone:
              validatedData.phone ?? '',

            address:
              validatedData.address ?? '',

            qualification:
              validatedData.qualification,

            gender:
              validatedData.gender,

            experience:
              validatedData.experience,

            status:
              validatedData.status,

            campusId:
              validatedData.campusId,

            ownerUserId,

            createdAt:
              Date.now(),

            updatedAt:
              Date.now(),
          })
          .returning()
          .execute();

      return result[0] || null;
    } catch (error) {
      console.error(
        'Error creating teacher:',
        error,
      );

      return null;
    }
  }

  // ------------------------------------------------
  // Count all teachers
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
          .from(teachers)
          .where(
            eq(
              teachers.ownerUserId,
              ownerUserId,
            ),
          );

      return result.length;
    } catch (error) {
      console.error(
        'Error counting teachers:',
        error,
      );

      return 0;
    }
  }

  // ------------------------------------------------
  // Get teacher by ID
  // ------------------------------------------------

  async getTeacherById(
    id: number,
  ): Promise<SelectTeacher | null> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const result =
        await this.db
          .select()
          .from(teachers)
          .where(
            and(
              eq(
                teachers.id,
                id,
              ),
              eq(
                teachers.ownerUserId,
                ownerUserId,
              ),
            ),
          )
          .get();

      return result || null;
    } catch (error) {
      console.error(
        'Error fetching teacher:',
        error,
      );

      return null;
    }
  }

  // ------------------------------------------------
  // Get teacher by email
  // ------------------------------------------------

  async getTeacherByEmail(
    email: string,
  ): Promise<SelectTeacher | null> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const result =
        await this.db
          .select()
          .from(teachers)
          .where(
            and(
              eq(
                teachers.email,
                email,
              ),
              eq(
                teachers.ownerUserId,
                ownerUserId,
              ),
            ),
          )
          .get();

      return result || null;
    } catch (error) {
      console.error(
        'Error fetching teacher by email:',
        error,
      );

      return null;
    }
  }

  // ------------------------------------------------
  // Get all teachers
  // ------------------------------------------------

  async getAllTeachers(
    options?: GetTeachersInput,
  ): Promise<SelectTeacher[]> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const {
        limit = 50,
        offset = 0,
        sortBy,
        sortOrder,
        search,
      } =
        GetTeachersSchema.parse(
          options || {},
        );

      const sortColumn =
        sortBy === 'firstName'
          ? teachers.firstName
          : sortBy === 'lastName'
            ? teachers.lastName
            : sortBy === 'createdAt'
              ? teachers.createdAt
              : teachers.updatedAt;

      const filters = [
        eq(
          teachers.ownerUserId,
          ownerUserId,
        ),
      ];

      if (search) {
        filters.push(
          like(
            teachers.firstName,
            `%${search}%`,
          ),
        );
      }

      return await this.db
        .select()
        .from(teachers)
        .where(and(...filters))
        .orderBy(
          sortOrder === 'asc'
            ? asc(sortColumn)
            : desc(sortColumn),
        )
        .limit(limit)
        .offset(offset)
        .execute();
    } catch (error) {
      console.error(
        'Error fetching teachers:',
        error,
      );

      return [];
    }
  }

  // ------------------------------------------------
  // Update teacher
  // ------------------------------------------------

  async updateTeacherById(
    id: number,
    data: UpdateTeacherInput,
  ): Promise<SelectTeacher | null> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const validatedData =
        UpdateTeacherSchema.parse(
          data,
        );

      // If campus changes, verify it belongs
      // to this user's school.
      if (
        validatedData.campusId !==
        undefined
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
                  validatedData.campusId,
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

      const result =
        await this.db
          .update(teachers)
          .set({
            ...validatedData,
            updatedAt:
              Date.now(),
          })
          .where(
            and(
              eq(
                teachers.id,
                id,
              ),
              eq(
                teachers.ownerUserId,
                ownerUserId,
              ),
            ),
          )
          .returning()
          .execute();

      return result[0] || null;
    } catch (error) {
      console.error(
        'Error updating teacher:',
        error,
      );

      return null;
    }
  }

  // ------------------------------------------------
  // Delete teacher
  // ------------------------------------------------

  async deleteTeacherById(
    id: number,
  ): Promise<boolean> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const result =
        await this.db
          .delete(teachers)
          .where(
            and(
              eq(
                teachers.id,
                id,
              ),
              eq(
                teachers.ownerUserId,
                ownerUserId,
              ),
            ),
          )
          .returning({
            id: teachers.id,
          })
          .execute();

      return result.length > 0;
    } catch (error) {
      console.error(
        'Error deleting teacher:',
        error,
      );

      return false;
    }
  }

  // ------------------------------------------------
  // Get teachers by campus
  // ------------------------------------------------

  async getByCampusId(
    campusId: number,
  ): Promise<SelectTeacher[]> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      return await this.db
        .select()
        .from(teachers)
        .where(
          and(
            eq(
              teachers.campusId,
              campusId,
            ),
            eq(
              teachers.ownerUserId,
              ownerUserId,
            ),
          ),
        )
        .orderBy(
          asc(teachers.firstName),
          asc(teachers.lastName),
        );
    } catch (error) {
      console.error(
        'Error fetching teachers by campus:',
        error,
      );

      return [];
    }
  }

  // ------------------------------------------------
  // Count teachers by campus
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
          .from(teachers)
          .where(
            and(
              eq(
                teachers.campusId,
                campusId,
              ),
              eq(
                teachers.ownerUserId,
                ownerUserId,
              ),
            ),
          );

      return result.length;
    } catch (error) {
      console.error(
        'Error counting teachers by campus:',
        error,
      );

      return 0;
    }
  }
}

export type TeacherServiceType =
  TeacherService;
