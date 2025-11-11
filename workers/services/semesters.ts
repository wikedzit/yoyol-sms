import { eq, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import {
  semesters,
  type InsertSemester,
  type SelectSemester,
} from '../database/semesters';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

// --- Zod Schemas for Validation ---
const CreateSemesterSchema = z.object({
  semesterNumber: z.number().min(1, 'Semester number must be at least 1').max(10),
  name: z.string().min(1, 'Semester name is required').max(200),
  description: z.string().optional(),
  yearId: z.number().min(1, 'Year ID is required'),
});

const UpdateSemesterSchema = CreateSemesterSchema.partial();

const GetSemestersSchema = z
  .object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
    sortBy: z
      .enum(['semesterNumber', 'name', 'createdAt', 'updatedAt'])
      .default('semesterNumber'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .optional();

// --- TypeScript types ---
export type CreateSemesterInput = z.infer<typeof CreateSemesterSchema>;
export type UpdateSemesterInput = z.infer<typeof UpdateSemesterSchema>;
export type GetSemestersInput = z.infer<typeof GetSemestersSchema>;

// --- Semester Service Class ---
export default class SemesterService {
  private db: DrizzleD1Database;

  constructor(database: DrizzleD1Database) {
    this.db = database;
  }

  // ✅ Create
  async createSemester(data: CreateSemesterInput): Promise<SelectSemester | null> {
    try {
      const validated = CreateSemesterSchema.parse(data);

      const result = await this.db
        .insert(semesters)
        .values({
          ...validated,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error creating semester:', error);
      return null;
    }
  }

  // ✅ Get by ID
  async getSemesterById(id: string): Promise<SelectSemester | null> {
    try {
      const result = await this.db
        .select()
        .from(semesters)
        .where(eq(semesters.id, parseInt(id)))
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching semester:', error);
      return null;
    }
  }

  // ✅ Get semesters by year ID
  async getSemestersByYearId(yearId: number): Promise<SelectSemester[]> {
    try {
      const result = await this.db
        .select()
        .from(semesters)
        .where(eq(semesters.yearId, yearId))
        .orderBy(asc(semesters.semesterNumber));
      return result || [];
    } catch (error) {
      console.error('Error fetching semesters by year ID:', error);
      return [];
    }
  }

  // ✅ Get all (with pagination, sorting)
  async getSemesters(options?: GetSemestersInput): Promise<SelectSemester[]> {
    try {
      const { limit, offset, sortBy, sortOrder } =
        GetSemestersSchema.parse(options) ?? {};

      const sortColumn =
        sortBy === 'semesterNumber'
          ? semesters.semesterNumber
          : sortBy === 'name'
          ? semesters.name
          : sortBy === 'createdAt'
          ? semesters.createdAt
          : semesters.updatedAt;

      return await this.db
        .select()
        .from(semesters)
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit ?? 50)
        .offset(offset ?? 0);
    } catch (error) {
      console.error('Error fetching semesters:', error);
      return [];
    }
  }

  // ✅ Update
  async updateSemester(
    id: string,
    data: UpdateSemesterInput
  ): Promise<SelectSemester | null> {
    try {
      const validated = UpdateSemesterSchema.parse(data);
      const updateValues: Partial<InsertSemester> = {
        ...validated,
        updatedAt: Date.now(),
      };

      const result = await this.db
        .update(semesters)
        .set(updateValues)
        .where(eq(semesters.id, parseInt(id)))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating semester:', error);
      return null;
    }
  }

  // ✅ Delete
  async deleteSemester(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(semesters)
        .where(eq(semesters.id, parseInt(id)))
        .returning({ id: semesters.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting semester:', error);
      return false;
    }
  }
}

