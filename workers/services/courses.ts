import { eq, desc, asc, like } from 'drizzle-orm';
import { z } from 'zod';
import {
  courses,
  type InsertCourse,
  type SelectCourse,
} from '../database/courses';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

// --- Zod Schemas for Validation ---
const CreateCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required').max(200),
  code: z.string().min(1, 'Course code is required').max(50),
  duration: z.string().min(1, 'Duration is required').max(50),
  totalStudent: z.number().optional().default(0),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  description: z.string().optional(),
  departmentId: z.number().optional(),
});

const UpdateCourseSchema = CreateCourseSchema.partial();

const GetCoursesSchema = z
  .object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
    sortBy: z
      .enum(['name', 'code', 'createdAt', 'updatedAt'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
  })
  .optional();

// --- TypeScript types ---
export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;
export type GetCoursesInput = z.infer<typeof GetCoursesSchema>;

// --- Course Service Class ---
export default class CourseService {
  private db: DrizzleD1Database;

  constructor(database: DrizzleD1Database) {
    this.db = database;
  }

  // ✅ Create
  async createCourse(data: CreateCourseInput): Promise<SelectCourse | null> {
    try {
      const validated = CreateCourseSchema.parse(data);

      const result = await this.db
        .insert(courses)
        .values({
          ...validated,
          departmentId: validated.departmentId ?? null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error creating course:', error);
      return null;
    }
  }

  // ✅ Get by ID
  async getCourseById(id: string): Promise<SelectCourse | null> {
    try {
      const result = await this.db
        .select()
        .from(courses)
        .where(eq(courses.id, parseInt(id)))
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching course:', error);
      return null;
    }
  }

  // ✅ Get courses by department ID
  async getCoursesByDepartmentId(
    departmentId: number
  ): Promise<SelectCourse[]> {
    try {
      const result = await this.db
        .select()
        .from(courses)
        .where(eq(courses.departmentId, departmentId));
      return result || [];
    } catch (error) {
      console.error('Error fetching courses by department ID:', error);
      return [];
    }
  }

  // ✅ Get all (with search, pagination, sorting)
  async getCourses(options?: GetCoursesInput): Promise<SelectCourse[]> {
    try {
      const { limit, offset, sortBy, sortOrder, search } =
        GetCoursesSchema.parse(options) ?? {};

      const sortColumn =
        sortBy === 'name'
          ? courses.name
          : sortBy === 'code'
          ? courses.code
          : sortBy === 'createdAt'
          ? courses.createdAt
          : courses.updatedAt;

      const query = this.db.select().from(courses);

      if (search) {
        query.where(like(courses.name, `%${search}%`));
      }

      return await query
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit ?? 50)
        .offset(offset ?? 0);
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  }

  // ✅ Update
  async updateCourse(
    id: string,
    data: UpdateCourseInput
  ): Promise<SelectCourse | null> {
    try {
      const validated = UpdateCourseSchema.parse(data);
      const updateValues: Partial<InsertCourse> = {
        ...validated,
        updatedAt: Date.now(),
      };

      const result = await this.db
        .update(courses)
        .set(updateValues)
        .where(eq(courses.id, parseInt(id)))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating course:', error);
      return null;
    }
  }

  // ✅ Delete
  async deleteCourse(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(courses)
        .where(eq(courses.id, parseInt(id)))
        .returning({ id: courses.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting course:', error);
      return false;
    }
  }
}
