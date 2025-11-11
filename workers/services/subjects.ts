// --- Zod schemas for validation ---
import { like, asc, desc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1/driver';
import { subject, type SelectSubject } from 'workers/database/subjects';
import { z } from 'zod';

export const subjectSchema = z.object({
  id: z.number().min(1).optional(),
  subjectName: z.string().min(2).max(100),
  code: z.string().min(2).max(10),
  departments: z.string().min(2).max(100),
  instructor: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  enrolledStudents: z.number().min(0).optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  // New field for departmentId
  departmentId: z.number().optional(),
});

const updateSubjectSchema = subjectSchema.partial();

const getSubjectsSchema = z.object({
  limit: z.number().min(1),
  offset: z.number().min(0).default(0).optional(),
  sortBy: z
    .enum(['subjectName', 'code', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
});

export type SubjectInput = z.infer<typeof subjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type GetSubjectsInput = z.infer<typeof getSubjectsSchema>;

// --- Subject Service ---
export default class SubjectService {
  private db: DrizzleD1Database;

  constructor(db: DrizzleD1Database) {
    this.db = db;
  }

  // Create a new subject
  async createSubject(data: SubjectInput): Promise<SelectSubject | null> {
    try {
      const validatedData = subjectSchema.parse(data);
      const result = await this.db
        .insert(subject)
        .values({
          ...validatedData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning()
        .execute();

      return result[0] || null;
    } catch (error: any) {
      console.error('Error creating subject:', error);
      // Check for UNIQUE constraint violation
      if (error?.message?.includes('UNIQUE constraint failed: subjects.code')) {
        throw new Error(
          'A subject with this code already exists. Please use a different code.'
        );
      }
      throw error;
    }
  }

  // Get subject by ID
  async getSubjectById(id: number): Promise<SelectSubject | null> {
    try {
      const result = await this.db
        .select()
        .from(subject)
        .where(eq(subject.id, id))
        .execute();

      return result[0] || null;
    } catch (error) {
      console.error('Error fetching subject by ID:', error);
      return null;
    }
  }

  // Get subject by code
  async getSubjectByCode(code: string): Promise<SelectSubject | null> {
    try {
      const result = await this.db
        .select()
        .from(subject)
        .where(eq(subject.code, code))
        .execute();

      return result[0] || null;
    } catch (error) {
      console.error('Error fetching subject by code:', error);
      return null;
    }
  }

  // Get Subjects by Department ID
  async getSubjectsByDepartmentId(
    departmentId: number
  ): Promise<SelectSubject[]> {
    try {
      const result = await this.db
        .select()
        .from(subject)
        .where(eq(subject.departmentId, departmentId))
        .execute();

      return result;
    } catch (error) {
      console.error('Error fetching subjects by department ID:', error);
      return [];
    }
  }

  // Get all subjects with pagination, search, and sorting
  async getAllSubjects(options?: GetSubjectsInput): Promise<SelectSubject[]> {
    try {
      const { limit, offset, sortBy, sortOrder, search } =
        getSubjectsSchema.parse(options || {});

      const sortColumn =
        sortBy === 'subjectName'
          ? subject.subjectName
          : sortBy === 'code'
          ? subject.code
          : sortBy === 'createdAt'
          ? subject.createdAt
          : subject.updatedAt;

      const query = this.db.select().from(subject);

      if (search) {
        query.where(like(subject.subjectName, `%${search}%`));
      }

      const results = await query
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit)
        .offset(offset ?? 0)
        .execute();

      return results;
    } catch (error) {
      console.error('Error fetching all subjects:', error);
      return [];
    }
  }

  // Update a subject
  async updateSubject(
    id: number,
    data: UpdateSubjectInput
  ): Promise<SelectSubject | null> {
    try {
      const validatedData = updateSubjectSchema.parse(data);
      const updateResult: Partial<SelectSubject> = {
        ...validatedData,
        updatedAt: new Date().toISOString(),
      };
      const result = await this.db
        .update(subject)
        .set(updateResult)
        .where(eq(subject.id, id))
        .returning()
        .execute();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating subject:', error);
      return null;
    }
  }

  // Delete a subject
  async deleteSubject(id: number): Promise<boolean> {
    try {
      await this.db.delete(subject).where(eq(subject.id, id)).execute();
      return true;
    } catch (error) {
      console.error('Error deleting subject:', error);
      return false;
    }
  }
}
