// --- Zod schemas for validation ---
import { like, asc, desc, eq, and } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1/driver';
import { subject, type SelectSubject } from 'workers/database/subjects';
import { z } from 'zod';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';

export const subjectSchema = z.object({
  id: z.number().min(1).optional(),
  subjectName: z.string().min(2).max(100),
  code: z.string().min(2).max(10),
  stream: z.string().min(2).max(100),
  instructor: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
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
  private db: DrizzleD1Database;
  private ownerUserId: number | null;

  constructor(db: DrizzleD1Database, ownerUserId: number | null) {
    this.db = db;
    this.ownerUserId = ownerUserId;
  }

  // Create a new subject
  async createSubject(data: SubjectInput): Promise<SelectSubject | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const validatedData = subjectSchema.parse(data);
      const result = await this.db
        .insert(subject)
        .values({
          ...validatedData,
          ownerUserId,
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
        .where(and(eq(subject.id, id), eq(subject.ownerUserId, ownerUserId)))
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
        .where(and(eq(subject.code, code), eq(subject.ownerUserId, ownerUserId)))
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
            eq(subject.ownerUserId, ownerUserId),
          ),
        )
        .execute();

      return result;
    } catch (error) {
      console.error('Error fetching subjects by stream ID:', error);
      return [];
    }
  }

  // Get all subjects with pagination, search, and sorting
  async getAllSubjects(options?: GetSubjectsInput): Promise<SelectSubject[]> {
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

      const filters = [eq(subject.ownerUserId, ownerUserId)];
      if (search) {
        filters.push(like(subject.subjectName, `%${search}%`));
      }

      const results = await this.db
        .select()
        .from(subject)
        .where(and(...filters))
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
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const validatedData = updateSubjectSchema.parse(data);
      const updateResult = {
        ...validatedData,
        updatedAt: Date.now(),
      };
      const result = await this.db
        .update(subject)
        .set(updateResult)
        .where(and(eq(subject.id, id), eq(subject.ownerUserId, ownerUserId)))
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
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      await this.db
        .delete(subject)
        .where(and(eq(subject.id, id), eq(subject.ownerUserId, ownerUserId)))
        .execute();
      return true;
    } catch (error) {
      console.error('Error deleting subject:', error);
      return false;
    }
  }
}
