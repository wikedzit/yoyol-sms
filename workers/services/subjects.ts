import { like, asc, desc, eq, and, sql } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { academicLevels, academicStreams } from 'workers/database/academic-levels';
import { subjectLevelLink } from '../kernel/academic-subjects';
import {
  subject,
  type SelectSubject,
} from 'workers/database/subjects';
import { studentSubjects } from 'workers/database/student-subjects';
import { z } from 'zod';
import { requireOwnerUserId, requireSchoolId } from 'workers/utils/require-owner-user';
export const subjectSchema = z.object({
  id: z.number().min(1).optional(),
  subjectName: z.string().min(2).max(100),
  code: z.string().min(2).max(10),
  description: z.string().max(500).optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  levelId: z.number().int().positive(),
  streamId: z.number().int().positive().nullable().optional(),
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
  private db: AppDatabase;
  private ownerUserId: number | null;
  private activeSchoolId: number | null;

  constructor(db: AppDatabase, ownerUserId: number | null, activeSchoolId: number | null = null) {
    this.db = db;
    this.ownerUserId = ownerUserId;
    this.activeSchoolId = activeSchoolId;
  }

  // Create a new subject
  async createSubject(data: SubjectInput): Promise<SelectSubject | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const validatedData = subjectSchema.parse(data);
      const link = await this.checkedLevelLink(validatedData.levelId, validatedData.streamId ?? null);
      const result = await this.db
        .insert(subject)
        .values({
          subjectName: validatedData.subjectName,
          code: validatedData.code,
          description: validatedData.description,
          status: validatedData.status,
          levelId: link.levelId,
          streamId: link.streamId,
          schoolId: requireSchoolId(this.activeSchoolId),
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
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(subject)
        .where(and(eq(subject.id, id), eq(subject.schoolId, requireSchoolId(this.activeSchoolId))))
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
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(subject)
        .where(and(eq(subject.code, code), eq(subject.schoolId, requireSchoolId(this.activeSchoolId))))
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
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(subject)
        .where(
          and(
            eq(subject.streamId, streamId),
            eq(subject.schoolId, requireSchoolId(this.activeSchoolId)),
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
async getAllSubjects(options?: GetSubjectsInput): Promise<Array<SelectSubject & { enrolledStudents: number }>> {
  try {
    const ownerUserId = requireOwnerUserId(this.ownerUserId);

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

    const filters = [eq(subject.schoolId, requireSchoolId(this.activeSchoolId))];

    if (search) {
      filters.push(like(subject.subjectName, `%${search}%`));
    }

    const results = await this.db
      .select({
        id: subject.id,
        subjectName: subject.subjectName,
        code: subject.code,
        description: subject.description,
        enrolledStudents: sql<number>`
          (
            SELECT COUNT(*)
            FROM ${studentSubjects}
            WHERE ${studentSubjects.subjectId} = ${subject.id}
          )
        `,
        status: subject.status,
        streamId: subject.streamId,
        levelId: subject.levelId,
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
    }));
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
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const validatedData = updateSubjectSchema.parse(data);
      const current = await this.getSubjectById(id);
      if (!current?.levelId && validatedData.levelId === undefined) {
        throw new Error('Choose a level for this subject.');
      }
      const levelId = validatedData.levelId ?? current?.levelId;
      if (!levelId) {
        throw new Error('Choose a level for this subject.');
      }
      const streamId = validatedData.streamId === undefined ? current?.streamId ?? null : validatedData.streamId;
      const link = await this.checkedLevelLink(levelId, streamId);
      const updateResult = {
        subjectName: validatedData.subjectName,
        code: validatedData.code,
        description: validatedData.description,
        status: validatedData.status,
        levelId: link.levelId,
        streamId: link.streamId,
        updatedAt: Date.now(),
      };
      const result = await this.db
        .update(subject)
        .set(updateResult)
        .where(and(eq(subject.id, id), eq(subject.schoolId, requireSchoolId(this.activeSchoolId))))
        .returning()
        .execute();

      return result[0] || null;
    } catch (error) {
      if (error instanceof Error && (
        error.message === 'Choose a level for this subject.'
        || error.message === 'Choose a stream from the same level.'
      )) {
        throw error;
      }
      console.error('Error updating subject:', error);
      return null;
    }
  }

  // Delete a subject
  async deleteSubject(id: number): Promise<boolean> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      await this.db
        .delete(subject)
        .where(and(eq(subject.id, id), eq(subject.schoolId, requireSchoolId(this.activeSchoolId))))
        .execute();
      return true;
    } catch (error) {
      console.error('Error deleting subject:', error);
      return false;
    }
  }

  private async checkedLevelLink(levelId: number, streamId: number | null) {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const level = await this.db
      .select({ id: academicLevels.id })
      .from(academicLevels)
      .where(and(eq(academicLevels.id, levelId), eq(academicLevels.schoolId, schoolId)))
      .get();
    if (!level) {
      throw new Error('Choose a level for this subject.');
    }
    const streams = await this.db
      .select({
        id: academicStreams.id,
        levelId: academicStreams.levelId,
        name: academicStreams.name,
      })
      .from(academicStreams)
      .where(eq(academicStreams.schoolId, schoolId));
    const link = subjectLevelLink({ levelId, streamId, streams });
    if ('error' in link) {
      throw new Error(link.error);
    }
    return link;
  }
}
