import { eq, desc, asc, and } from 'drizzle-orm';
import { z } from 'zod';
import {
  academicLevels,
  academicStreams,
  academicForms,
  formClasses,
  type InsertAcademicLevel,
  type SelectAcademicLevel,
  type InsertAcademicStream,
  type SelectAcademicStream,
  type InsertAcademicForm,
  type SelectAcademicForm,
  type InsertFormClass,
  type SelectFormClass,
} from '../database/academic-levels';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

// --- Zod Schemas for Validation ---

// Level schemas
const CreateLevelSchema = z.object({
  name: z.string().min(1, 'Level name is required').max(100),
  type: z.enum(['o-level', 'a-level']),
  description: z.string().optional(),
});

const UpdateLevelSchema = CreateLevelSchema.partial();

// Stream schemas
const CreateStreamSchema = z.object({
  name: z.string().min(1, 'Stream name is required').max(100),
  levelId: z.number().int().positive(),
  levelType: z.enum(['o-level', 'a-level']),
  color: z.enum(['science', 'arts', 'business']),
});

const UpdateStreamSchema = CreateStreamSchema.partial();

// Form schemas
const CreateFormSchema = z.object({
  name: z.string().min(1, 'Form name is required').max(100),
  number: z.number().int().min(1).max(6),
  streamId: z.number().int().positive(),
  levelId: z.number().int().positive(),
});

const UpdateFormSchema = CreateFormSchema.partial();

// FormClass schemas
const CreateFormClassSchema = z.object({
  name: z.string().min(1, 'Class name is required').max(100),
  formId: z.number().int().positive(),
  streamId: z.number().int().positive(),
  levelId: z.number().int().positive(),
  studentCount: z.number().int().min(0).optional().default(0),
});

const UpdateFormClassSchema = CreateFormClassSchema.partial();

// --- TypeScript types ---
export type CreateLevelInput = z.infer<typeof CreateLevelSchema>;
export type UpdateLevelInput = z.infer<typeof UpdateLevelSchema>;
export type CreateStreamInput = z.infer<typeof CreateStreamSchema>;
export type UpdateStreamInput = z.infer<typeof UpdateStreamSchema>;
export type CreateFormInput = z.infer<typeof CreateFormSchema>;
export type UpdateFormInput = z.infer<typeof UpdateFormSchema>;
export type CreateFormClassInput = z.infer<typeof CreateFormClassSchema>;
export type UpdateFormClassInput = z.infer<typeof UpdateFormClassSchema>;

// --- Academic Level Service Class ---
export default class AcademicLevelService {
  private db: DrizzleD1Database;

  constructor(database: DrizzleD1Database) {
    this.db = database;
  }

  // ==================== LEVEL OPERATIONS ====================

  async createLevel(data: CreateLevelInput): Promise<SelectAcademicLevel | null> {
    try {
      const validated = CreateLevelSchema.parse(data);
      const result = await this.db
        .insert(academicLevels)
        .values({
          ...validated,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error creating level:', error);
      return null;
    }
  }

  async getLevelById(id: number): Promise<SelectAcademicLevel | null> {
    try {
      const result = await this.db
        .select()
        .from(academicLevels)
        .where(eq(academicLevels.id, id))
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching level:', error);
      return null;
    }
  }

  async getLevelByType(type: string): Promise<SelectAcademicLevel | null> {
    try {
      const result = await this.db
        .select()
        .from(academicLevels)
        .where(eq(academicLevels.type, type))
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching level by type:', error);
      return null;
    }
  }

  async getLevels(): Promise<SelectAcademicLevel[]> {
    try {
      return await this.db
        .select()
        .from(academicLevels)
        .orderBy(asc(academicLevels.name));
    } catch (error) {
      console.error('Error fetching levels:', error);
      return [];
    }
  }

  async updateLevel(
    id: number,
    data: UpdateLevelInput
  ): Promise<SelectAcademicLevel | null> {
    try {
      const validated = UpdateLevelSchema.parse(data);
      const result = await this.db
        .update(academicLevels)
        .set({
          ...validated,
          updatedAt: Date.now(),
        })
        .where(eq(academicLevels.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating level:', error);
      return null;
    }
  }

  async deleteLevel(id: number): Promise<boolean> {
    try {
      const result = await this.db
        .delete(academicLevels)
        .where(eq(academicLevels.id, id))
        .returning({ id: academicLevels.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting level:', error);
      return false;
    }
  }

  // ==================== STREAM OPERATIONS ====================

  async createStream(data: CreateStreamInput): Promise<SelectAcademicStream | null> {
    try {
      const validated = CreateStreamSchema.parse(data);
      const result = await this.db
        .insert(academicStreams)
        .values({
          ...validated,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error creating stream:', error);
      return null;
    }
  }

  async getStreamById(id: number): Promise<SelectAcademicStream | null> {
    try {
      const result = await this.db
        .select()
        .from(academicStreams)
        .where(eq(academicStreams.id, id))
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching stream:', error);
      return null;
    }
  }

  async getStreamsByLevelId(levelId: number): Promise<SelectAcademicStream[]> {
    try {
      return await this.db
        .select()
        .from(academicStreams)
        .where(eq(academicStreams.levelId, levelId))
        .orderBy(asc(academicStreams.name));
    } catch (error) {
      console.error('Error fetching streams by level:', error);
      return [];
    }
  }

  async getStreamsByLevelType(levelType: string): Promise<SelectAcademicStream[]> {
    try {
      return await this.db
        .select()
        .from(academicStreams)
        .where(eq(academicStreams.levelType, levelType))
        .orderBy(asc(academicStreams.name));
    } catch (error) {
      console.error('Error fetching streams by level type:', error);
      return [];
    }
  }

  async getAllStreams(): Promise<SelectAcademicStream[]> {
    try {
      return await this.db
        .select()
        .from(academicStreams)
        .orderBy(asc(academicStreams.name));
    } catch (error) {
      console.error('Error fetching all streams:', error);
      return [];
    }
  }

  async updateStream(
    id: number,
    data: UpdateStreamInput
  ): Promise<SelectAcademicStream | null> {
    try {
      const validated = UpdateStreamSchema.parse(data);
      const result = await this.db
        .update(academicStreams)
        .set({
          ...validated,
          updatedAt: Date.now(),
        })
        .where(eq(academicStreams.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating stream:', error);
      return null;
    }
  }

  async deleteStream(id: number): Promise<boolean> {
    try {
      const result = await this.db
        .delete(academicStreams)
        .where(eq(academicStreams.id, id))
        .returning({ id: academicStreams.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting stream:', error);
      return false;
    }
  }

  // ==================== FORM OPERATIONS ====================

  async createForm(data: CreateFormInput): Promise<SelectAcademicForm | null> {
    try {
      const validated = CreateFormSchema.parse(data);
      const result = await this.db
        .insert(academicForms)
        .values({
          ...validated,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error creating form:', error);
      return null;
    }
  }

  async getFormById(id: number): Promise<SelectAcademicForm | null> {
    try {
      const result = await this.db
        .select()
        .from(academicForms)
        .where(eq(academicForms.id, id))
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching form:', error);
      return null;
    }
  }

  async getFormsByStreamId(streamId: number): Promise<SelectAcademicForm[]> {
    try {
      return await this.db
        .select()
        .from(academicForms)
        .where(eq(academicForms.streamId, streamId))
        .orderBy(asc(academicForms.number));
    } catch (error) {
      console.error('Error fetching forms by stream:', error);
      return [];
    }
  }

  async getFormsByLevelId(levelId: number): Promise<SelectAcademicForm[]> {
    try {
      return await this.db
        .select()
        .from(academicForms)
        .where(eq(academicForms.levelId, levelId))
        .orderBy(asc(academicForms.number));
    } catch (error) {
      console.error('Error fetching forms by level:', error);
      return [];
    }
  }

  async getFormByStreamIdAndNumber(
    streamId: number,
    formNumber: number
  ): Promise<SelectAcademicForm | null> {
    try {
      const result = await this.db
        .select()
        .from(academicForms)
        .where(
          and(
            eq(academicForms.streamId, streamId),
            eq(academicForms.number, formNumber)
          )
        )
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching form by stream and number:', error);
      return null;
    }
  }

  async getAllForms(): Promise<SelectAcademicForm[]> {
    try {
      return await this.db
        .select()
        .from(academicForms)
        .orderBy(asc(academicForms.number));
    } catch (error) {
      console.error('Error fetching all forms:', error);
      return [];
    }
  }

  async updateForm(
    id: number,
    data: UpdateFormInput
  ): Promise<SelectAcademicForm | null> {
    try {
      const validated = UpdateFormSchema.parse(data);
      const result = await this.db
        .update(academicForms)
        .set({
          ...validated,
          updatedAt: Date.now(),
        })
        .where(eq(academicForms.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating form:', error);
      return null;
    }
  }

  async deleteForm(id: number): Promise<boolean> {
    try {
      const result = await this.db
        .delete(academicForms)
        .where(eq(academicForms.id, id))
        .returning({ id: academicForms.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting form:', error);
      return false;
    }
  }

  // ==================== FORM CLASS OPERATIONS ====================

  async createFormClass(data: CreateFormClassInput): Promise<SelectFormClass | null> {
    try {
      const validated = CreateFormClassSchema.parse(data);
      const result = await this.db
        .insert(formClasses)
        .values({
          ...validated,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error creating form class:', error);
      return null;
    }
  }

  async getFormClassById(id: number): Promise<SelectFormClass | null> {
    try {
      const result = await this.db
        .select()
        .from(formClasses)
        .where(eq(formClasses.id, id))
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching form class:', error);
      return null;
    }
  }

  async getFormClassesByFormId(formId: number): Promise<SelectFormClass[]> {
    try {
      return await this.db
        .select()
        .from(formClasses)
        .where(eq(formClasses.formId, formId))
        .orderBy(asc(formClasses.name));
    } catch (error) {
      console.error('Error fetching form classes by form:', error);
      return [];
    }
  }

  async getFormClassesByStreamId(streamId: number): Promise<SelectFormClass[]> {
    try {
      return await this.db
        .select()
        .from(formClasses)
        .where(eq(formClasses.streamId, streamId))
        .orderBy(asc(formClasses.name));
    } catch (error) {
      console.error('Error fetching form classes by stream:', error);
      return [];
    }
  }

  async getAllFormClasses(): Promise<SelectFormClass[]> {
    try {
      return await this.db
        .select()
        .from(formClasses)
        .orderBy(asc(formClasses.name));
    } catch (error) {
      console.error('Error fetching all form classes:', error);
      return [];
    }
  }

  async updateFormClass(
    id: number,
    data: UpdateFormClassInput
  ): Promise<SelectFormClass | null> {
    try {
      const validated = UpdateFormClassSchema.parse(data);
      const result = await this.db
        .update(formClasses)
        .set({
          ...validated,
          updatedAt: Date.now(),
        })
        .where(eq(formClasses.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating form class:', error);
      return null;
    }
  }

  async deleteFormClass(id: number): Promise<boolean> {
    try {
      const result = await this.db
        .delete(formClasses)
        .where(eq(formClasses.id, id))
        .returning({ id: formClasses.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting form class:', error);
      return false;
    }
  }

  // ==================== AGGREGATE QUERIES ====================

  async getStreamWithForms(streamId: number): Promise<{
    stream: SelectAcademicStream | null;
    forms: SelectAcademicForm[];
  }> {
    const stream = await this.getStreamById(streamId);
    const forms = await this.getFormsByStreamId(streamId);
    return { stream, forms };
  }

  async getFormWithClasses(formId: number): Promise<{
    form: SelectAcademicForm | null;
    classes: SelectFormClass[];
  }> {
    const form = await this.getFormById(formId);
    const classes = await this.getFormClassesByFormId(formId);
    return { form, classes };
  }

  async getLevelWithStreams(levelId: number): Promise<{
    level: SelectAcademicLevel | null;
    streams: SelectAcademicStream[];
  }> {
    const level = await this.getLevelById(levelId);
    const streams = await this.getStreamsByLevelId(levelId);
    return { level, streams };
  }

  // Count forms by stream
  async countFormsByStreamId(streamId: number): Promise<number> {
    try {
      const forms = await this.getFormsByStreamId(streamId);
      return forms.length;
    } catch (error) {
      console.error('Error counting forms by stream:', error);
      return 0;
    }
  }

  // Count classes by form
  async countClassesByFormId(formId: number): Promise<number> {
    try {
      const classes = await this.getFormClassesByFormId(formId);
      return classes.length;
    } catch (error) {
      console.error('Error counting classes by form:', error);
      return 0;
    }
  }

  // Get total students in a form
  async getTotalStudentsInForm(formId: number): Promise<number> {
    try {
      const classes = await this.getFormClassesByFormId(formId);
      return classes.reduce((sum, cls) => sum + (cls.studentCount || 0), 0);
    } catch (error) {
      console.error('Error getting total students in form:', error);
      return 0;
    }
  }

  // Count classes by stream ID and form number (for static forms)
  async countClassesByStreamAndFormNumber(
    streamId: number,
    formNumber: number
  ): Promise<number> {
    try {
      // First find the form with this stream and number
      const form = await this.getFormByStreamIdAndNumber(streamId, formNumber);
      if (!form) return 0;
      return await this.countClassesByFormId(form.id);
    } catch (error) {
      console.error('Error counting classes by stream and form number:', error);
      return 0;
    }
  }

  // Get total students by stream ID and form number (for static forms)
  async getTotalStudentsByStreamAndFormNumber(
    streamId: number,
    formNumber: number
  ): Promise<number> {
    try {
      // First find the form with this stream and number
      const form = await this.getFormByStreamIdAndNumber(streamId, formNumber);
      if (!form) return 0;
      return await this.getTotalStudentsInForm(form.id);
    } catch (error) {
      console.error('Error getting total students by stream and form number:', error);
      return 0;
    }
  }
}

