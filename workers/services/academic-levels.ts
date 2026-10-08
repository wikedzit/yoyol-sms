import { eq, desc, asc, and } from 'drizzle-orm';
import { z } from 'zod';
import {
  enrolmentCountByClass,
  refusalToRemoveForm,
  refusalToRemoveLevel,
  refusalToRemoveStream,
} from '../kernel/academic-structure';
import { subject } from '../database/subjects';
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
import { campus } from '../database/campuses';
import { students } from '../database/students';
import { school } from '../database/school';
import type { AppDatabase } from '../database/app-database';
import { requireSchoolId } from 'workers/utils/require-owner-user';

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
  campusId: z.number().int().positive().optional(),
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
  private db: AppDatabase;
  private ownerUserId: number | null;
  private activeSchoolId: number | null;

  constructor(database: AppDatabase, ownerUserId: number | null, activeSchoolId: number | null = null) {
    this.db = database;
    this.ownerUserId = ownerUserId;
    this.activeSchoolId = activeSchoolId;
  }

  private schoolId(): number {
    return requireSchoolId(this.activeSchoolId);
  }

  // ==================== LEVEL OPERATIONS ====================

  async createLevel(data: CreateLevelInput): Promise<SelectAcademicLevel | null> {
    try {
      const validated = CreateLevelSchema.parse(data);
      const result = await this.db
        .insert(academicLevels)
        .values({
          ...validated,
          schoolId: await this.schoolId(),
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
        .where(
          and(
            eq(academicLevels.id, id),
            eq(academicLevels.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
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
        .where(
          and(
            eq(academicLevels.type, type),
            eq(academicLevels.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
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
        .where(eq(academicLevels.schoolId, requireSchoolId(this.activeSchoolId)))
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
        .where(
          and(
            eq(academicLevels.id, id),
            eq(academicLevels.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating level:', error);
      return null;
    }
  }

  async deleteLevel(id: number): Promise<boolean> {
    try {
      const schoolId = requireSchoolId(this.activeSchoolId);
      const refusal = refusalToRemoveLevel({
        streamCount: await this.rowCount(
          this.db
            .select({ id: academicStreams.id })
            .from(academicStreams)
            .where(and(eq(academicStreams.levelId, id), eq(academicStreams.schoolId, schoolId)))
            .limit(1),
        ),
        classCount: await this.rowCount(
          this.db
            .select({ id: formClasses.id })
            .from(formClasses)
            .where(and(eq(formClasses.levelId, id), eq(formClasses.schoolId, schoolId)))
            .limit(1),
        ),
        subjectCount: await this.rowCount(
          this.db
            .select({ id: subject.id })
            .from(subject)
            .where(and(eq(subject.levelId, id), eq(subject.schoolId, schoolId)))
            .limit(1),
        ),
      });
      if (refusal) {
        throw new Error(refusal);
      }

      const result = await this.db
        .delete(academicLevels)
        .where(
          and(
            eq(academicLevels.id, id),
            eq(academicLevels.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .returning({ id: academicLevels.id });
      return result.length > 0;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Remove the ')) {
        throw error;
      }
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
          schoolId: await this.schoolId(),
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
        .where(
          and(
            eq(academicStreams.id, id),
            eq(academicStreams.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
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
        .where(
          and(
            eq(academicStreams.levelId, levelId),
            eq(academicStreams.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
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
        .where(
          and(
            eq(academicStreams.levelType, levelType),
            eq(academicStreams.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
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
        .where(eq(academicStreams.schoolId, requireSchoolId(this.activeSchoolId)))
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
        .where(
          and(
            eq(academicStreams.id, id),
            eq(academicStreams.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating stream:', error);
      return null;
    }
  }

  async deleteStream(id: number): Promise<boolean> {
    try {
      const schoolId = requireSchoolId(this.activeSchoolId);
      const refusal = refusalToRemoveStream({
        formCount: await this.rowCount(
          this.db
            .select({ id: academicForms.id })
            .from(academicForms)
            .where(and(eq(academicForms.streamId, id), eq(academicForms.schoolId, schoolId)))
            .limit(1),
        ),
        classCount: await this.rowCount(
          this.db
            .select({ id: formClasses.id })
            .from(formClasses)
            .where(and(eq(formClasses.streamId, id), eq(formClasses.schoolId, schoolId)))
            .limit(1),
        ),
      });
      if (refusal) {
        throw new Error(refusal);
      }

      const result = await this.db
        .delete(academicStreams)
        .where(
          and(
            eq(academicStreams.id, id),
            eq(academicStreams.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .returning({ id: academicStreams.id });
      return result.length > 0;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Remove the ')) {
        throw error;
      }
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
          schoolId: await this.schoolId(),
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
        .where(
          and(
            eq(academicForms.id, id),
            eq(academicForms.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
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
        .where(
          and(
            eq(academicForms.streamId, streamId),
            eq(academicForms.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
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
        .where(
          and(
            eq(academicForms.levelId, levelId),
            eq(academicForms.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
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
            eq(academicForms.number, formNumber),
            eq(academicForms.schoolId, requireSchoolId(this.activeSchoolId)),
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
        .where(eq(academicForms.schoolId, requireSchoolId(this.activeSchoolId)))
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
        .where(
          and(
            eq(academicForms.id, id),
            eq(academicForms.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating form:', error);
      return null;
    }
  }

  async deleteForm(id: number): Promise<boolean> {
    try {
      const schoolId = requireSchoolId(this.activeSchoolId);
      const refusal = refusalToRemoveForm(
        await this.rowCount(
          this.db
            .select({ id: formClasses.id })
            .from(formClasses)
            .where(and(eq(formClasses.formId, id), eq(formClasses.schoolId, schoolId)))
            .limit(1),
        ),
      );
      if (refusal) {
        throw new Error(refusal);
      }

      const result = await this.db
        .delete(academicForms)
        .where(
          and(
            eq(academicForms.id, id),
            eq(academicForms.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .returning({ id: academicForms.id });
      return result.length > 0;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Remove the ')) {
        throw error;
      }
      console.error('Error deleting form:', error);
      return false;
    }
  }

  // ==================== FORM CLASS OPERATIONS ====================

  async createFormClass(data: CreateFormClassInput): Promise<SelectFormClass | null> {
    try {
      const validated = CreateFormClassSchema.parse(data);
      if (validated.campusId) {
        const ownedCampus = await this.db
          .select({ id: campus.id })
          .from(campus)
          .innerJoin(school, eq(campus.schoolId, school.id))
          .where(
            and(
              eq(campus.id, validated.campusId),
              eq(school.id, requireSchoolId(this.activeSchoolId)),
            ),
          )
          .get();
        if (!ownedCampus) {
          return null;
        }
      }
      const result = await this.db
        .insert(formClasses)
        .values({
          ...validated,
          schoolId: await this.schoolId(),
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
        .where(
          and(
            eq(formClasses.id, id),
            eq(formClasses.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .get();
      if (!result) {
        return null;
      }
      const counts = await this.enrolmentCounts();
      return { ...result, studentCount: counts.get(result.id) ?? 0 };
    } catch (error) {
      console.error('Error fetching form class:', error);
      return null;
    }
  }

  async getFormClassesByFormId(formId: number): Promise<SelectFormClass[]> {
    try {
      const classes = await this.db
        .select()
        .from(formClasses)
        .where(
          and(
            eq(formClasses.formId, formId),
            eq(formClasses.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .orderBy(asc(formClasses.name));
      return this.withEnrolmentCounts(classes);
    } catch (error) {
      console.error('Error fetching form classes by form:', error);
      return [];
    }
  }

  async getFormClassesByStreamId(streamId: number): Promise<SelectFormClass[]> {
    try {
      const classes = await this.db
        .select()
        .from(formClasses)
        .where(
          and(
            eq(formClasses.streamId, streamId),
            eq(formClasses.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .orderBy(asc(formClasses.name));
      return this.withEnrolmentCounts(classes);
    } catch (error) {
      console.error('Error fetching form classes by stream:', error);
      return [];
    }
  }

  async getAllFormClasses(): Promise<SelectFormClass[]> {
    try {
      const classes = await this.db
        .select()
        .from(formClasses)
        .where(eq(formClasses.schoolId, requireSchoolId(this.activeSchoolId)))
        .orderBy(asc(formClasses.name));
      return this.withEnrolmentCounts(classes);
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
        .where(
          and(
            eq(formClasses.id, id),
            eq(formClasses.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating form class:', error);
      return null;
    }
  }

  async deleteFormClass(id: number): Promise<boolean> {
    try {
      const studentUsing = await this.db
        .select({ id: students.id })
        .from(students)
        .where(
          and(
            eq(students.formClassId, id),
            eq(students.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .get();
      if (studentUsing) {
        throw new Error('This class still has students.');
      }

      const result = await this.db
        .delete(formClasses)
        .where(
          and(
            eq(formClasses.id, id),
            eq(formClasses.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .returning({ id: formClasses.id });
      return result.length > 0;
    } catch (error) {
      if (error instanceof Error && error.message === 'This class still has students.') {
        throw error;
      }
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

  // ==================== ENRICHED QUERIES FOR CLASSES PAGE ====================

  /**
   * Get all form classes with enriched data (stream, form, level info)
   * Used by the unified /classes page
   */
  async getAllFormClassesWithDetails(options?: {
    levelType?: 'o-level' | 'a-level';
    search?: string;
  }): Promise<
    Array<{
      id: number;
      name: string;
      formId: number;
      streamId: number;
      levelId: number;
      studentCount: number;
      formName: string;
      formNumber: number;
      streamName: string;
      streamColor: 'science' | 'arts' | 'business';
      levelName: string;
      levelType: 'o-level' | 'a-level';
      campusId: number | null;
      campusName: string | null;
    }>
  > {
    try {
      // Get all streams (optionally filtered by level type)
      let streams: SelectAcademicStream[];
      if (options?.levelType) {
        streams = await this.getStreamsByLevelType(options.levelType);
      } else {
        streams = await this.getAllStreams();
      }

      // Get all levels for lookup
      const levels = await this.getLevels();
      const levelMap = new Map(levels.map((l) => [l.id, l]));

      // Get all forms for lookup
      const forms = await this.getAllForms();
      const formMap = new Map(forms.map((f) => [f.id, f]));

      // Get all form classes
      const allClasses = await this.getAllFormClasses();
      const campusRows = await this.db
        .select({ id: campus.id, name: campus.name })
        .from(campus)
        .innerJoin(school, eq(campus.schoolId, school.id))
        .where(eq(school.id, requireSchoolId(this.activeSchoolId)));
      const campusNames = new Map(campusRows.map((row) => [row.id, row.name]));

      // Enrich classes with related data
      const enrichedClasses = allClasses
        .map((cls) => {
          const form = formMap.get(cls.formId);
          const stream = streams.find((s) => s.id === cls.streamId);
          const level = stream ? levelMap.get(stream.levelId) : null;

          if (!form || !stream || !level) return null;

          // Apply level type filter if specified
          if (options?.levelType && level.type !== options.levelType) {
            return null;
          }

          // Apply search filter if specified
          if (options?.search) {
            const searchLower = options.search.toLowerCase();
            const matchesSearch =
              cls.name.toLowerCase().includes(searchLower) ||
              form.name.toLowerCase().includes(searchLower) ||
              stream.name.toLowerCase().includes(searchLower);
            if (!matchesSearch) return null;
          }

          return {
            id: cls.id,
            name: cls.name,
            formId: cls.formId,
            streamId: cls.streamId,
            levelId: cls.levelId,
            studentCount: cls.studentCount,
            formName: form.name,
            formNumber: form.number,
            streamName: stream.name,
            streamColor: stream.color as 'science' | 'arts' | 'business',
            levelName: level.name,
            levelType: level.type as 'o-level' | 'a-level',
            campusId: cls.campusId,
            campusName: cls.campusId
              ? (campusNames.get(cls.campusId) ?? null)
              : null,
          };
        })
        .filter((cls): cls is NonNullable<typeof cls> => cls !== null);

      // Sort by level type (O-Level first), then form number, then class name
      return enrichedClasses.sort((a, b) => {
        if (a.levelType !== b.levelType) {
          return a.levelType === 'o-level' ? -1 : 1;
        }
        if (a.formNumber !== b.formNumber) {
          return a.formNumber - b.formNumber;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('Error fetching enriched form classes:', error);
      return [];
    }
  }

  /**
   * Get form classes filtered by level ID
   */
  async getFormClassesByLevelId(levelId: number): Promise<SelectFormClass[]> {
    try {
      const classes = await this.db
        .select()
        .from(formClasses)
        .where(
          and(
            eq(formClasses.levelId, levelId),
            eq(formClasses.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .orderBy(asc(formClasses.name));
      return this.withEnrolmentCounts(classes);
    } catch (error) {
      console.error('Error fetching form classes by level:', error);
      return [];
    }
  }

  /**
   * Get a single form class by ID with enriched data (stream, form, level info)
   * Used by the class detail page
   */
  async getFormClassByIdWithDetails(classId: number): Promise<{
    id: number;
    name: string;
    formId: number;
    streamId: number;
    levelId: number;
    studentCount: number;
    formName: string;
    formNumber: number;
    streamName: string;
    streamColor: 'science' | 'arts' | 'business';
    levelName: string;
    levelType: 'o-level' | 'a-level';
  } | null> {
    try {
      // Get the form class
      const formClass = await this.getFormClassById(classId);
      if (!formClass) return null;

      // Get the form
      const form = await this.getFormById(formClass.formId);
      if (!form) return null;

      // Get the stream
      const stream = await this.getStreamById(formClass.streamId);
      if (!stream) return null;

      // Get the level
      const level = await this.getLevelById(formClass.levelId);
      if (!level) return null;

      return {
        id: formClass.id,
        name: formClass.name,
        formId: formClass.formId,
        streamId: formClass.streamId,
        levelId: formClass.levelId,
        studentCount: formClass.studentCount,
        formName: form.name,
        formNumber: form.number,
        streamName: stream.name,
        streamColor: stream.color as 'science' | 'arts' | 'business',
        levelName: level.name,
        levelType: level.type as 'o-level' | 'a-level',
      };
    } catch (error) {
      console.error('Error fetching form class with details:', error);
      return null;
    }
  }

  private async rowCount(query: PromiseLike<readonly unknown[]>): Promise<number> {
    const rows = await query;
    return rows.length;
  }

  private async enrolmentCounts(): Promise<Map<number, number>> {
    const rows = await this.db
      .select({ formClassId: students.formClassId })
      .from(students)
      .where(eq(students.schoolId, requireSchoolId(this.activeSchoolId)));
    return enrolmentCountByClass(rows);
  }

  private async withEnrolmentCounts(classes: SelectFormClass[]): Promise<SelectFormClass[]> {
    if (classes.length === 0) {
      return classes;
    }
    const counts = await this.enrolmentCounts();
    return classes.map((formClass) => ({
      ...formClass,
      studentCount: counts.get(formClass.id) ?? 0,
    }));
  }
}

