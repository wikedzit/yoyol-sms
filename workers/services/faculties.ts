import { eq, desc, asc, like, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  faculties,
  type InsertFaculty,
  type SelectFaculty,
} from '../database/faculties';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { departments } from '../database/departments';

// --- Zod Schemas for Validation ---
const CreateFacultySchema = z.object({
  name: z.string().min(1, 'Faculty name is required').max(100),
  code: z.string().min(1, 'Faculty code is required').max(20),
  dean: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const UpdateFacultySchema = CreateFacultySchema.partial();

const GetFacultiesSchema = z
  .object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
    sortBy: z
      .enum(['name', 'code', 'createdAt', 'updatedAt'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
    search: z.string().optional(),
  })
  .optional();

// --- TypeScript types ---
export type CreateFacultyInput = z.infer<typeof CreateFacultySchema>;
export type UpdateFacultyInput = z.infer<typeof UpdateFacultySchema>;
export type GetFacultiesInput = z.infer<typeof GetFacultiesSchema>;

// Extended faculty type with computed fields
export type FacultyWithStats = SelectFaculty & {
  departments: number;
  courses: number;
};

// --- Faculty Service Class ---
export default class FacultyService {
  private db: DrizzleD1Database;

  constructor(database: DrizzleD1Database) {
    this.db = database;
  }

  // ✅ Create
  async createFaculty(
    data: CreateFacultyInput
  ): Promise<SelectFaculty | null> {
    try {
      const validated = CreateFacultySchema.parse(data);

      const result = await this.db
        .insert(faculties)
        .values({
          ...validated,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error creating faculty:', error);
      return null;
    }
  }

  // ✅ Get by ID
  async getFacultyById(id: string): Promise<SelectFaculty | null> {
    try {
      const result = await this.db
        .select()
        .from(faculties)
        .where(eq(faculties.id, parseInt(id)))
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching faculty:', error);
      return null;
    }
  }

  // ✅ Get by ID with stats
  async getFacultyByIdWithStats(
    id: string
  ): Promise<FacultyWithStats | null> {
    try {
      const faculty = await this.getFacultyById(id);
      if (!faculty) return null;

      // Count departments by faculty ID
      const departmentsList = await this.db
        .select()
        .from(departments)
        .where(eq(departments.facultyId, faculty.id));
      const departmentsCount = departmentsList.length;

      // Count courses (when faculty_id is added to subjects/courses table)
      // For now, return 0 as courses don't have faculty_id yet
      const coursesCount = 0;

      return {
        ...faculty,
        departments: departmentsCount,
        courses: coursesCount,
      };
    } catch (error) {
      console.error('Error fetching faculty with stats:', error);
      return null;
    }
  }

  // ✅ Get all (with search, pagination, sorting)
  async getFaculties(options?: GetFacultiesInput): Promise<SelectFaculty[]> {
    try {
      const { limit, offset, sortBy, sortOrder, search } =
        GetFacultiesSchema.parse(options) ?? {};

      const sortColumn =
        sortBy === 'name'
          ? faculties.name
          : sortBy === 'code'
          ? faculties.code
          : sortBy === 'createdAt'
          ? faculties.createdAt
          : faculties.updatedAt;

      let query = this.db.select().from(faculties);

      if (search) {
        query = query.where(
          sql`${faculties.name} LIKE ${'%' + search + '%'} OR ${faculties.code} LIKE ${'%' + search + '%'} OR ${faculties.dean} LIKE ${'%' + search + '%'}`
        ) as any;
      }

      const results = await query
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit ?? 50)
        .offset(offset ?? 0);

      return results;
    } catch (error) {
      console.error('Error fetching faculties:', error);
      return [];
    }
  }

  // ✅ Get all with stats
  async getFacultiesWithStats(
    options?: GetFacultiesInput
  ): Promise<FacultyWithStats[]> {
    try {
      const facultiesList = await this.getFaculties(options);

      // Map faculties and add stats
      return Promise.all(
        facultiesList.map(async (faculty) => {
          const departmentsList = await this.db
            .select()
            .from(departments)
            .where(eq(departments.facultyId, faculty.id));
          return {
            ...faculty,
            departments: departmentsList.length,
            courses: 0, // TODO: Calculate from subjects/courses table when faculty_id exists
          };
        })
      );
    } catch (error) {
      console.error('Error fetching faculties with stats:', error);
      return [];
    }
  }

  // ✅ Update
  async updateFaculty(
    id: string,
    data: UpdateFacultyInput
  ): Promise<SelectFaculty | null> {
    try {
      const validated = UpdateFacultySchema.parse(data);
      const updateValues: Partial<InsertFaculty> = {
        ...validated,
        updatedAt: Date.now(),
      };

      const result = await this.db
        .update(faculties)
        .set(updateValues)
        .where(eq(faculties.id, parseInt(id)))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating faculty:', error);
      return null;
    }
  }

  // ✅ Delete
  async deleteFaculty(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(faculties)
        .where(eq(faculties.id, parseInt(id)))
        .returning({ id: faculties.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting faculty:', error);
      return false;
    }
  }
}

