import { eq, desc, asc, like } from 'drizzle-orm';
import { z } from 'zod';
import {
  departments,
  type InsertDepartment,
  type SelectDepartment,
} from '../database/departments';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

// --- Zod Schemas for Validation ---
const CreateDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100),
  code: z.string().min(1, 'Department code is required').max(20),
  headOfDepartment: z.string().optional(),
  totalStudent: z.number().optional().default(0),
  totalFaculty: z.number().optional().default(0),
  description: z.string().optional(),
  establishedDate: z.string().optional(), // YYYY-MM-DD
  status: z.enum(['Active', 'Inactive']).default('Active'),
  facultyId: z.number().optional(),
});

const UpdateDepartmentSchema = CreateDepartmentSchema.partial();

const GetDepartmentsSchema = z
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
export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof UpdateDepartmentSchema>;
export type GetDepartmentsInput = z.infer<typeof GetDepartmentsSchema>;

// --- Department Service Class ---
export default class DepartmentService {
  private db: DrizzleD1Database;

  constructor(database: DrizzleD1Database) {
    this.db = database;
  }

  // ✅ Create
  async createDepartment(
    data: CreateDepartmentInput
  ): Promise<SelectDepartment | null> {
    try {
      const validated = CreateDepartmentSchema.parse(data);

      const result = await this.db
        .insert(departments)
        .values({
          ...validated,
          facultyId: validated.facultyId ?? null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error creating department:', error);
      return null;
    }
  }

  // ✅ Get by ID
  async getDepartmentById(id: string): Promise<SelectDepartment | null> {
    try {
      const result = await this.db
        .select()
        .from(departments)
        .where(eq(departments.id, parseInt(id)))
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching department:', error);
      return null;
    }
  }

  // ✅ Get departments by faculty ID
  async getDepartmentsByFacultyId(
    facultyId: number
  ): Promise<SelectDepartment[]> {
    try {
      const result = await this.db
        .select()
        .from(departments)
        .where(eq(departments.facultyId, facultyId));
      return result || [];
    } catch (error) {
      console.error('Error fetching departments by faculty ID:', error);
      return [];
    }
  }

  // ✅ Get all (with search, pagination, sorting)
  async getDepartments(
    options: GetDepartmentsInput
  ): Promise<SelectDepartment[]> {
    try {
      const { limit, offset, sortBy, sortOrder, search } =
        GetDepartmentsSchema.parse(options) ?? {};

      const sortColumn =
        sortBy === 'name'
          ? departments.name
          : sortBy === 'code'
          ? departments.code
          : sortBy === 'createdAt'
          ? departments.createdAt
          : departments.updatedAt;

      const query = this.db.select().from(departments);

      if (search) {
        query.where(like(departments.name, `%${search}%`));
      }

      return await query
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit ?? 10)
        .offset(offset ?? 0);
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [];
    }
  }

  // ✅ Update
  async updateDepartment(
    id: string,
    data: UpdateDepartmentInput
  ): Promise<SelectDepartment | null> {
    try {
      const validated = UpdateDepartmentSchema.parse(data);
      const updateValues: Partial<InsertDepartment> = {
        ...validated,
        updatedAt: Date.now(),
      };

      const result = await this.db
        .update(departments)
        .set(updateValues)
        .where(eq(departments.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating department:', error);
      return null;
    }
  }

  // ✅ Delete
  async deleteDepartment(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(departments)
        .where(eq(departments.id, id))
        .returning({ id: departments.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting department:', error);
      return false;
    }
  }
}
