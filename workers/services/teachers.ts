import { eq, like, asc, desc } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { teachers, type SelectTeacher } from 'workers/database';

import { z } from 'zod';

// --- Zod Schemas ---
const CreateTeacherSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  subject: z.string().min(1, 'Subject is required').max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  qualification: z.string().optional(),
  gender: z.string().min(1, 'Gender is required').max(10),
  experience: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().min(0).optional()),
  status: z.enum(['Active', 'Inactive']).default('Active'),
});

const UpdateTeacherSchema = CreateTeacherSchema.partial();

const GetTeachersSchema = z.object({
  limit: z.number().min(1).max(100).default(50).optional(),
  offset: z.number().min(0).default(0).optional(),
  sortBy: z
    .enum(['firstName', 'lastName', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
});

export type CreateTeacherInput = z.infer<typeof CreateTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof UpdateTeacherSchema>;
export type GetTeachersInput = z.infer<typeof GetTeachersSchema>;

// --- Teacher Service ---
export default class TeacherService {
  constructor(private db: DrizzleD1Database) {}

  async createTeacher(data: CreateTeacherInput): Promise<SelectTeacher | null> {
    try {
      const validatedData = CreateTeacherSchema.parse(data);
      const result = await this.db
        .insert(teachers)
        .values({
          ...validatedData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning()
        .execute();

      return result[0] || null;
    } catch (error) {
      console.error('Error creating teacher:', error);
      return null;
    }
  }

  async countAll(): Promise<number> {
    try {
      const result = await this.db
        .select()
        .from(teachers);

      return result.length;
    } catch (error) {
      console.error('Error counting teachers:', error);
      return 0;
    }
  }

  async getTeacherById(id: number): Promise<SelectTeacher | null> {
    try {
      const result = await this.db
        .select()
        .from(teachers)
        .where(eq(teachers.id, id))
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching teacher:', error);
      return null;
    }
  }

  async getTeacherByEmail(email: string): Promise<SelectTeacher | null> {
    try {
      const result = await this.db
        .select()
        .from(teachers)
        .where(eq(teachers.email, email))
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching teacher by email:', error);
      return null;
    }
  }

  async getAllTeachers(options?: GetTeachersInput): Promise<SelectTeacher[]> {
    try {
      const {
        limit = 50,
        offset = 0,
        sortBy,
        sortOrder,
        search,
      } = GetTeachersSchema.parse(options || {});

      const sortColumn =
        sortBy === 'firstName'
          ? teachers.firstName
          : sortBy === 'lastName'
          ? teachers.lastName
          : sortBy === 'createdAt'
          ? teachers.createdAt
          : teachers.updatedAt;

      const query = this.db.select().from(teachers);
      if (search) {
        query.where(like(teachers.firstName, `%${search}%`));
      }

      const result = await query
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit)
        .offset(offset)
        .execute();

      return result;
    } catch (error) {
      console.error('Error fetching teachers:', error);
      return [];
    }
  }

  async updateTeacherById(
    id: number,
    data: UpdateTeacherInput
  ): Promise<SelectTeacher | null> {
    try {
      const validatedData = UpdateTeacherSchema.parse(data);
      const result = await this.db
        .update(teachers)
        .set({ ...validatedData, updatedAt: new Date().toISOString() })
        .where(eq(teachers.id, id))
        .returning()
        .execute();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating teacher:', error);
      return null;
    }
  }

  async deleteTeacherById(id: number): Promise<boolean> {
    try {
      await this.db.delete(teachers).where(eq(teachers.id, id)).execute();
      return true;
    } catch (error) {
      console.error('Error deleting teacher:', error);
      return false;
    }
  }
}
export type TeacherServiceType = TeacherService;
