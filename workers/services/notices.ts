import type SchoolAccess from './school-access';
import { eq, desc, asc, like, and } from 'drizzle-orm';
import { z } from 'zod';
import {
  notices,
  type InsertNotice,
  type SelectNotice,
} from '../database/notices';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

// --- Zod Schemas for Validation ---
const CreateNoticeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  type: z.enum(['exam', 'holiday', 'registration', 'meeting', 'info']).default('info'),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  status: z.enum(['Active', 'Inactive']).default('Active'),
});

const UpdateNoticeSchema = CreateNoticeSchema.partial();

const GetNoticesSchema = z
  .object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
    sortBy: z
      .enum(['title', 'date', 'createdAt', 'updatedAt'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().optional(),
    status: z.enum(['Active', 'Inactive']).optional(),
  })
  .optional();

// --- TypeScript types ---
export type CreateNoticeInput = z.infer<typeof CreateNoticeSchema>;
export type UpdateNoticeInput = z.infer<typeof UpdateNoticeSchema>;
export type GetNoticesInput = z.infer<typeof GetNoticesSchema>;

// --- Notice Service Class ---
export default class NoticeService {
  constructor(
    private db: DrizzleD1Database,
    private schoolAccess: SchoolAccess,
  ) {}

  async createNotice(
    data: CreateNoticeInput
  ): Promise<SelectNotice | null> {
    try {
    const schoolId = await this.schoolAccess.schoolFor('school.school.update');
    if (schoolId == null) {
      return null;
    }

      const validated = CreateNoticeSchema.parse(data);

      const result = await this.db
        .insert(notices)
        .values({
          ...validated,
          schoolId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error creating notice:', error);
      return null;
    }
  }

  async getNoticeById(id: string): Promise<SelectNotice | null> {
    try {
    const schoolId = await this.schoolAccess.schoolFor('school.school.read');
    if (schoolId == null) {
      return null;
    }

      const result = await this.db
        .select()
        .from(notices)
        .where(
          and(
            eq(notices.id, parseInt(id)),
            eq(notices.schoolId, schoolId),
          ),
        )
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching notice:', error);
      return null;
    }
  }

  async getNotices(options?: GetNoticesInput): Promise<SelectNotice[]> {
    try {
    const schoolId = await this.schoolAccess.schoolFor('school.school.read');
    if (schoolId == null) {
      return [];
    }

      const { limit, offset, sortBy, sortOrder, search, status: statusFilter } =
        GetNoticesSchema.parse(options) ?? {};

      const sortColumn =
        sortBy === 'title'
          ? notices.title
          : sortBy === 'date'
          ? notices.date
          : sortBy === 'createdAt'
          ? notices.createdAt
          : notices.updatedAt;

      const conditions = [eq(notices.schoolId, schoolId)];
      if (search) {
        conditions.push(like(notices.title, `%${search}%`));
      }
      if (statusFilter) {
        conditions.push(eq(notices.status, statusFilter));
      }

      return await this.db
        .select()
        .from(notices)
        .where(and(...conditions))
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit ?? 50)
        .offset(offset ?? 0);
    } catch (error) {
      console.error('Error fetching notices:', error);
      return [];
    }
  }

  async getActiveNotices(limit?: number): Promise<SelectNotice[]> {
    try {
    const schoolId = await this.schoolAccess.schoolFor('school.school.read');
    if (schoolId == null) {
      return [];
    }

      return await this.db
        .select()
        .from(notices)
        .where(
          and(
            eq(notices.status, 'Active'),
            eq(notices.schoolId, schoolId),
          ),
        )
        .orderBy(desc(notices.createdAt))
        .limit(limit ?? 10);
    } catch (error) {
      console.error('Error fetching active notices:', error);
      return [];
    }
  }

  async updateNotice(
    id: string,
    data: UpdateNoticeInput
  ): Promise<SelectNotice | null> {
    try {
    const schoolId = await this.schoolAccess.schoolFor('school.school.update');
    if (schoolId == null) {
      return null;
    }

      const validated = UpdateNoticeSchema.parse(data);
      const updateValues: Partial<InsertNotice> = {
        ...validated,
        updatedAt: Date.now(),
      };

      const result = await this.db
        .update(notices)
        .set(updateValues)
        .where(
          and(
            eq(notices.id, parseInt(id)),
            eq(notices.schoolId, schoolId),
          ),
        )
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating notice:', error);
      return null;
    }
  }

  async deleteNotice(id: string): Promise<boolean> {
    try {
    const schoolId = await this.schoolAccess.schoolFor('school.school.update');
    if (schoolId == null) {
      return false;
    }

      const result = await this.db
        .delete(notices)
        .where(
          and(
            eq(notices.id, parseInt(id)),
            eq(notices.schoolId, schoolId),
          ),
        )
        .returning({ id: notices.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting notice:', error);
      return false;
    }
  }
}

