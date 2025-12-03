import { eq, desc, asc, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import { classes, type InsertClass, type SelectClass } from '../database/class';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { students } from 'workers/database';

// Zod schemas for validation
const CreateClassSchema = z.object({
  name: z
    .string()
    .min(1, 'Class name is required')
    .max(100, 'Class name too long'),
  EducationalLevel: z.string().min(1, 'Educational level is required'),
  section: z.string().optional(),
  year: z
    .number()
    .min(1900, 'Year must be valid')
    .max(2100, 'Year must be valid'),
  // new field for departmentId
  departmentId: z.number().optional(),
});

const UpdateClassSchema = z.object({
  name: z
    .string()
    .min(1, 'Class name is required')
    .max(100, 'Class name too long')
    .optional(),
  EducationalLevel: z
    .string()
    .min(1, 'Educational level is required')
    .optional(),
  section: z.string().optional(),
  year: z
    .number()
    .min(1900, 'Year must be valid')
    .max(2100, 'Year must be valid')
    .optional(),
});

const GetClassesSchema = z
  .object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
    sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
  })
  .optional();

export type CreateClassInput = z.infer<typeof CreateClassSchema>;
export type UpdateClassInput = z.infer<typeof UpdateClassSchema>;
export type GetClassesInput = z.infer<typeof GetClassesSchema>;

/**
 * LEGACY: University-style class service
 *
 * This service manages the old `classes` table from the university-level structure.
 * For the new school-based structure (O-Level/A-Level), use AcademicLevelService
 * which manages:
 * - Academic Levels (O-Level, A-Level)
 * - Streams (Science, Arts, Business)
 * - Forms (Form 1-6)
 * - Form Classes (3A, 3B, etc.)
 *
 * See: workers/services/academic-levels.ts
 *
 * @deprecated Use AcademicLevelService for new school features
 */
export default class ClassService {
  private db: DrizzleD1Database;

  constructor(database: DrizzleD1Database) {
    this.db = database;
  }

  /**
   * Create a new class
   */
  async create(data: CreateClassInput): Promise<SelectClass | null> {
    try {
      const validatedData = CreateClassSchema.parse(data);

      const result = await this.db
        .insert(classes)
        .values({
          name: validatedData.name,
          EducationalLevel: validatedData.EducationalLevel,
          section: validatedData.section,
          year: validatedData.year,
          departmentId: validatedData.departmentId ?? null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error creating class:', error);
      return null;
    }
  }

  /**
   * Get class by ID
   */
  async getById(id: number): Promise<SelectClass | null> {
    try {
      const result = await this.db
        .select()
        .from(classes)
        .where(eq(classes.id, id))
        .get();

      return result || null;
    } catch (error) {
      console.error('Error fetching class:', error);
      return null;
    }
  }

  // Get all classes by department ID
  async getClassesByDepartmentId(departmentId: number): Promise<SelectClass[]> {
    try {
      const result = await this.db
        .select()
        .from(classes)
        .where(eq(classes.departmentId, departmentId))
        .execute();
      return result || [];
    } catch (error) {
      console.error('Error fetching classes by department ID:', error);
      return [];
    }
  }

  // Get all classes by department ID with student count
  async getClassesByDepartmentIdWithStudentCount(
    departmentId: number
  ): Promise<(SelectClass & { studentCount: number })[]> {
    try {
      const result = await this.db
        .select({
          id: classes.id,
          name: classes.name,
          EducationalLevel: classes.EducationalLevel,
          section: classes.section,
          year: classes.year,
          departmentId: classes.departmentId,
          createdAt: classes.createdAt,
          updatedAt: classes.updatedAt,
          studentCount: sql<number>`COUNT(${students.id})`.as('studentCount'),
        })
        .from(classes)
        .leftJoin(students, eq(students.classId, classes.id))
        .where(eq(classes.departmentId, departmentId))
        .groupBy(
          classes.id,
          classes.name,
          classes.EducationalLevel,
          classes.section,
          classes.year,
          classes.departmentId,
          classes.createdAt,
          classes.updatedAt
        )
        .orderBy(desc(classes.createdAt));

      return result;
    } catch (error) {
      console.error(
        'Error fetching classes by department ID with student counts:',
        error
      );
      return [];
    }
  }

  /**
   * Get all classes with optional filters
   */
  async getAll(options: GetClassesInput): Promise<SelectClass[]> {
    try {
      const { limit, offset, sortBy, sortOrder, search } =
        GetClassesSchema.parse(options) ?? {};

      // Get the correct column for sorting
      const sortColumn =
        sortBy === 'name'
          ? classes.name
          : sortBy === 'createdAt'
          ? classes.createdAt
          : classes.updatedAt;

      if (search) {
        const result = await this.db
          .select()
          .from(classes)
          .where(like(classes.name, `%${search}%`))
          .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
          .limit(limit ?? 10)
          .offset(offset ?? 0);
        return result;
      } else {
        const result = await this.db
          .select()
          .from(classes)
          .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
          .limit(limit ?? 10)
          .offset(offset ?? 0);
        return result;
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      return [];
    }
  }

  // get all classes with student count
  async getAllWithStudentCount(
    options: GetClassesInput
  ): Promise<(SelectClass & { studentCount: number })[]> {
    try {
      const { limit, offset, sortBy, sortOrder, search } =
        GetClassesSchema.parse(options) ?? {};

      const sortColumn =
        sortBy === 'name'
          ? classes.name
          : sortBy === 'createdAt'
          ? classes.createdAt
          : classes.updatedAt;

      // 💡 One SQL query using LEFT JOIN for performance
      const result = await this.db
        .select({
          id: classes.id,
          name: classes.name,
          EducationalLevel: classes.EducationalLevel,
          section: classes.section,
          year: classes.year,
          createdAt: classes.createdAt,
          updatedAt: classes.updatedAt,
          studentCount: sql<number>`COUNT(${students.id})`.as('studentCount'),
        })
        .from(classes)
        .leftJoin(students, eq(students.classId, classes.id))
        .where(search ? like(classes.name, `%${search}%`) : undefined)
        .groupBy(
          classes.id,
          classes.name,
          classes.EducationalLevel,
          classes.section,
          classes.year,
          classes.createdAt,
          classes.updatedAt
        )
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit ?? 10)
        .offset(offset ?? 0);

      return result;
    } catch (error) {
      console.error('Error fetching classes with student counts:', error);
      return [];
    }
  }

  /**
   * Update class
   */
  async update(
    id: number,
    data: UpdateClassInput & { departmentId?: number }
  ): Promise<SelectClass | null> {
    try {
      const validatedData = UpdateClassSchema.parse(data);

      const updateValues: Partial<InsertClass> = {
        ...validatedData,
        departmentId: data.departmentId ?? undefined,
        updatedAt: Date.now(),
      };

      const result = await this.db
        .update(classes)
        .set(updateValues)
        .where(eq(classes.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating class:', error);
      return null;
    }
  }

  /**
   * Delete class
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.db
        .delete(classes)
        .where(eq(classes.id, id))
        .returning({ id: classes.id });

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting class:', error);
      return false;
    }
  }

  /**
   * Check if class exists by name
   */
  async exists(name: string): Promise<boolean> {
    try {
      const result = await this.db
        .select({ id: classes.id })
        .from(classes)
        .where(eq(classes.name, name))
        .get();

      return result !== null;
    } catch (error) {
      console.error('Error checking class existence:', error);
      return false;
    }
  }
}
