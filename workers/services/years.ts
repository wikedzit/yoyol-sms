import { eq, desc, asc } from 'drizzle-orm';
import { z } from 'zod';
import {
  years,
  type InsertYear,
  type SelectYear,
} from '../database/years';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

// --- Zod Schemas for Validation ---
const CreateYearSchema = z.object({
  yearNumber: z.number().min(1, 'Year number must be at least 1').max(10),
  name: z.string().min(1, 'Year name is required').max(200),
  description: z.string().optional(),
  courseId: z.number().min(1, 'Course ID is required'),
});

const UpdateYearSchema = CreateYearSchema.partial();

const GetYearsSchema = z
  .object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
    sortBy: z
      .enum(['yearNumber', 'name', 'createdAt', 'updatedAt'])
      .default('yearNumber'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .optional();

// --- TypeScript types ---
export type CreateYearInput = z.infer<typeof CreateYearSchema>;
export type UpdateYearInput = z.infer<typeof UpdateYearSchema>;
export type GetYearsInput = z.infer<typeof GetYearsSchema>;

// --- Year Service Class ---
export default class YearService {
  private db: DrizzleD1Database;

  constructor(database: DrizzleD1Database) {
    this.db = database;
  }

  // ✅ Create
  async createYear(data: CreateYearInput): Promise<SelectYear | null> {
    try {
      const validated = CreateYearSchema.parse(data);

      const result = await this.db
        .insert(years)
        .values({
          ...validated,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error creating year:', error);
      return null;
    }
  }

  // ✅ Get by ID
  async getYearById(id: string): Promise<SelectYear | null> {
    try {
      const result = await this.db
        .select()
        .from(years)
        .where(eq(years.id, parseInt(id)))
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching year:', error);
      return null;
    }
  }

  // ✅ Get years by course ID
  async getYearsByCourseId(courseId: number): Promise<SelectYear[]> {
    try {
      const result = await this.db
        .select()
        .from(years)
        .where(eq(years.courseId, courseId))
        .orderBy(asc(years.yearNumber));
      return result || [];
    } catch (error) {
      console.error('Error fetching years by course ID:', error);
      return [];
    }
  }

  // ✅ Get all (with pagination, sorting)
  async getYears(options?: GetYearsInput): Promise<SelectYear[]> {
    try {
      const { limit, offset, sortBy, sortOrder } =
        GetYearsSchema.parse(options) ?? {};

      const sortColumn =
        sortBy === 'yearNumber'
          ? years.yearNumber
          : sortBy === 'name'
          ? years.name
          : sortBy === 'createdAt'
          ? years.createdAt
          : years.updatedAt;

      return await this.db
        .select()
        .from(years)
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit ?? 50)
        .offset(offset ?? 0);
    } catch (error) {
      console.error('Error fetching years:', error);
      return [];
    }
  }

  // ✅ Update
  async updateYear(
    id: string,
    data: UpdateYearInput
  ): Promise<SelectYear | null> {
    try {
      const validated = UpdateYearSchema.parse(data);
      const updateValues: Partial<InsertYear> = {
        ...validated,
        updatedAt: Date.now(),
      };

      const result = await this.db
        .update(years)
        .set(updateValues)
        .where(eq(years.id, parseInt(id)))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating year:', error);
      return null;
    }
  }

  // ✅ Delete
  async deleteYear(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(years)
        .where(eq(years.id, parseInt(id)))
        .returning({ id: years.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting year:', error);
      return false;
    }
  }
}

