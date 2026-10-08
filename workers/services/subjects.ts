import type SchoolAccess from './school-access';
import { like, asc, desc, eq, and, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1/driver';
import {
  subject,
  type SelectSubject,
} from 'workers/database/subjects';
import { studentSubjects } from 'workers/database/student-subjects';
import { z } from 'zod';
export const subjectSchema = z.object({
  id: z.number().min(1).optional(),
  subjectName: z.string().min(2).max(100),
  code: z.string().min(2).max(10),
  stream: z.string().min(2).max(100), // Stream name (Science, Arts, Business)
  instructor: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  enrolledStudents: z.number().min(0).optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  // Foreign key to academic streams (required)
  streamId: z.number().min(1),
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
  constructor(
    private db: DrizzleD1Database,
    private schoolAccess: SchoolAccess,
  ) {}

  // Create a new subject
  async createSubject(data: SubjectInput): Promise<SelectSubject | null> {
    try {
    const schoolId = await this.schoolAccess.schoolFor('school.school.update');
    if (schoolId == null) {
      return null;
    }

      const validatedData = subjectSchema.parse(data);
      const result = await this.db
        .insert(subject)
        .values({
          ...validatedData,
          schoolId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning()
        .execute();

      return result[0] || null;
    } catch (error: unknown) {
      console.error('Error creating subject:', error);
      const message = error instanceof Error ? error.message : '';
      if (message.includes('UNIQUE constraint failed')) {
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
    const schoolId = await this.schoolAccess.schoolFor('school.school.read');
    if (schoolId == null) {
      return null;
    }

      const result = await this.db
        .select()
        .from(subject)
        .where(and(eq(subject.id, id), eq(subject.schoolId, schoolId)))
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
    const schoolId = await this.schoolAccess.schoolFor('school.school.read');
    if (schoolId == null) {
      return null;
    }

      const result = await this.db
        .select()
        .from(subject)
        .where(and(eq(subject.code, code), eq(subject.schoolId, schoolId)))
        .execute();

      return result[0] || null;
    } catch (error) {
      console.error('Error fetching subject by code:', error);
      return null;
    }
  }

  // Get Subjects by Stream ID
  async getSubjectsByStreamId(streamId: number): Promise<SelectSubject[]> {
    try {
    const schoolId = await this.schoolAccess.schoolFor('school.school.read');
    if (schoolId == null) {
      return [];
    }

      const result = await this.db
        .select()
        .from(subject)
        .where(
          and(
            eq(subject.streamId, streamId),
            eq(subject.schoolId, schoolId),
          ),
        )
        .execute();

      return result;
    } catch (error) {
      console.error('Error fetching subjects by stream ID:', error);
      return [];
    }
  }

  // Get all subjects with pagination, search, sorting,
// and REAL number of students enrolled
async getAllSubjects(options?: GetSubjectsInput): Promise<SelectSubject[]> {
  try {
    const schoolId = await this.schoolAccess.schoolFor('school.school.read');
    if (schoolId == null) {
      return [];
    }

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

    const filters = [eq(subject.schoolId, schoolId)];

    if (search) {
      filters.push(like(subject.subjectName, `%${search}%`));
    }

    const results = await this.db
      .select({
        id: subject.id,
        subjectName: subject.subjectName,
        code: subject.code,
        stream: subject.stream,
        instructor: subject.instructor,
        description: subject.description,

        // 🔥 REAL student count
        enrolledStudents: sql<number>`
          (
            SELECT COUNT(*)
            FROM ${studentSubjects}
            WHERE ${studentSubjects.subjectId} = ${subject.id}
          )
        `,

        status: subject.status,
        streamId: subject.streamId,
        schoolId: subject.schoolId,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt,
      })
      .from(subject)
      .where(and(...filters))
      .orderBy(
        sortOrder === 'asc'
          ? asc(sortColumn)
          : desc(sortColumn)
      )
      .limit(limit)
      .offset(offset ?? 0)
      .execute();

    return results.map((item) => ({
      ...item,
      enrolledStudents: Number(item.enrolledStudents ?? 0),
    })) as SelectSubject[];
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
    const schoolId = await this.schoolAccess.schoolFor('school.school.update');
    if (schoolId == null) {
      return null;
    }

      const validatedData = updateSubjectSchema.parse(data);
      const updateResult = {
        ...validatedData,
        updatedAt: Date.now(),
      };
      const result = await this.db
        .update(subject)
        .set(updateResult)
        .where(and(eq(subject.id, id), eq(subject.schoolId, schoolId)))
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
    const schoolId = await this.schoolAccess.schoolFor('school.school.update');
    if (schoolId == null) {
      return false;
    }

      await this.db
        .delete(subject)
        .where(and(eq(subject.id, id), eq(subject.schoolId, schoolId)))
        .execute();
      return true;
    } catch (error) {
      console.error('Error deleting subject:', error);
      return false;
    }
  }
}
