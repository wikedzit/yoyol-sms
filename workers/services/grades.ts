import { eq, desc, asc, and, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import {
  grades,
  type InsertGrade,
  type SelectGrade,
} from '../database/grades';
import type { AppDatabase } from '../database/app-database';
import { students } from '../database/students';
import { subject } from '../database/subjects';
import { academicStreams, academicForms, academicLevels } from '../database/academic-levels';
import { teachers } from '../database/teachers';
import { requireOwnerUserId, requireSchoolId } from 'workers/utils/require-owner-user';
// Helper function to calculate grade from score
const getGradeFromScore = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

// Zod schemas for validation
const CreateGradeSchema = z.object({
  studentId: z.number().min(1, 'Student is required'),
  subjectId: z.number().min(1, 'Subject is required'),
  streamId: z.number().min(1, 'Stream is required'),
  formId: z.number().min(1, 'Form is required'),
  teacherId: z.number().optional(),
  score: z
    .number()
    .min(0, 'Score must be at least 0')
    .max(100, 'Score must be at most 100'),
  remarks: z.string().optional(),
});

const UpdateGradeSchema = CreateGradeSchema.partial();

const GetGradesSchema = z
  .object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
    sortBy: z
      .enum(['score', 'grade', 'createdAt', 'updatedAt'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    studentId: z.number().optional(),
    subjectId: z.number().optional(),
    streamId: z.number().optional(),
    formId: z.number().optional(),
    teacherId: z.number().optional(),
    levelId: z.number().optional(),
  })
  .optional();

// TypeScript types
export type CreateGradeInput = z.infer<typeof CreateGradeSchema>;
export type UpdateGradeInput = z.infer<typeof UpdateGradeSchema>;
export type GetGradesInput = z.infer<typeof GetGradesSchema>;

// Extended grade type with related data
export type GradeWithRelations = SelectGrade & {
  student: {
    id: number;
    firstName: string;
    lastName: string;
    classId: number | null;
  };
  subject: {
    id: number;
    subjectName: string;
    code: string;
  };
  stream: {
    id: number;
    name: string;
    levelId: number;
    levelType: string;
    color: string;
  };
  form: {
    id: number;
    name: string;
    number: number;
  };
  teacher: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  level?: {
    id: number;
    name: string;
    type: string;
  };
};

/**
 * Grades Service Class
 */
export default class GradeService {
  private db: AppDatabase;
  private ownerUserId: number | null;
  private activeSchoolId: number | null;

  constructor(database: AppDatabase, ownerUserId: number | null, activeSchoolId: number | null = null) {
    this.db = database;
    this.ownerUserId = ownerUserId;
    this.activeSchoolId = activeSchoolId;
  }

  /**
   * Create a new grade
   */
  async create(data: CreateGradeInput): Promise<SelectGrade | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const validated = CreateGradeSchema.parse(data);
      const grade = getGradeFromScore(validated.score);

      const ownedStudent = await this.db
        .select({ id: students.id, schoolId: students.schoolId })
        .from(students)
        .where(
          and(
            eq(students.id, validated.studentId),
            eq(students.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .get();

      if (!ownedStudent) {
        return null;
      }

      const result = await this.db
        .insert(grades)
        .values({
          ...validated,
          grade,
          schoolId: ownedStudent.schoolId ?? requireSchoolId(this.activeSchoolId),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error creating grade:', error);
      return null;
    }
  }

  /**
   * Get grade by ID with relations
   */
  async getById(id: string): Promise<GradeWithRelations | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const grade = await this.db
        .select()
        .from(grades)
        .where(
          and(
            eq(grades.id, parseInt(id)),
            eq(grades.schoolId, requireSchoolId(this.activeSchoolId)),
            ne(grades.status, 'Archived'),
          ),
        )
        .get();

      if (!grade) return null;

      return await this.enrichGradeWithRelations(grade);
    } catch (error) {
      console.error('Error fetching grade:', error);
      return null;
    }
  }

  /**
   * Get all grades with optional filters
   */
  async getAll(options?: GetGradesInput): Promise<GradeWithRelations[]> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const {
        limit,
        offset,
        sortBy,
        sortOrder,
        studentId,
        subjectId,
        streamId,
        formId,
        teacherId,
        levelId,
      } = GetGradesSchema.parse(options) ?? {};

      const conditions = [
        eq(grades.schoolId, requireSchoolId(this.activeSchoolId)),
        ne(grades.status, 'Archived'),
      ];
      if (studentId) conditions.push(eq(grades.studentId, studentId));
      if (subjectId) conditions.push(eq(grades.subjectId, subjectId));
      if (streamId) conditions.push(eq(grades.streamId, streamId));
      if (formId) conditions.push(eq(grades.formId, formId));
      if (teacherId) conditions.push(eq(grades.teacherId, teacherId));

      // Handle level filter (filter by stream's level)
      let gradeIds: number[] | null = null;
      if (levelId) {
        const levelStreams = await this.db
          .select({ id: academicStreams.id })
          .from(academicStreams)
          .where(
            and(
              eq(academicStreams.levelId, levelId),
              eq(academicStreams.schoolId, requireSchoolId(this.activeSchoolId)),
            ),
          );
        
        const streamIds = levelStreams.map(s => s.id);
        if (streamIds.length === 0) return [];

        const levelGrades = await this.db
          .select({ id: grades.id })
          .from(grades)
          .where(
            and(
              inArray(grades.streamId, streamIds),
              eq(grades.schoolId, requireSchoolId(this.activeSchoolId)),
            ),
          );
        
        gradeIds = levelGrades.map(g => g.id);
        if (gradeIds.length === 0) return [];
        conditions.push(inArray(grades.id, gradeIds));
      }

      const sortColumn =
        sortBy === 'score'
          ? grades.score
          : sortBy === 'grade'
          ? grades.grade
          : sortBy === 'createdAt'
          ? grades.createdAt
          : grades.updatedAt;

      const results = await this.db
        .select()
        .from(grades)
        .where(and(...conditions))
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit ?? 50)
        .offset(offset ?? 0);

      const enrichedResults = await Promise.all(
        results.map((grade) => this.enrichGradeWithRelations(grade))
      );

      return enrichedResults.filter((g): g is GradeWithRelations => g !== null);
    } catch (error) {
      console.error('Error fetching grades:', error);
      return [];
    }
  }

  /**
   * Enrich grade with related data
   */
  private async enrichGradeWithRelations(
    grade: SelectGrade
  ): Promise<GradeWithRelations | null> {
    try {
      // Fetch student
      const student = await this.db
        .select({
          id: students.id,
          firstName: students.firstName,
          lastName: students.lastName,
          classId: students.classId,
        })
        .from(students)
        .where(eq(students.id, grade.studentId))
        .get();

      if (!student) return null;

      // Fetch subject
      const subjectData = await this.db
        .select({
          id: subject.id,
          subjectName: subject.subjectName,
          code: subject.code,
        })
        .from(subject)
        .where(eq(subject.id, grade.subjectId))
        .get();

      if (!subjectData) return null;

      // Fetch stream
      const streamData = await this.db
        .select({
          id: academicStreams.id,
          name: academicStreams.name,
          levelId: academicStreams.levelId,
          levelType: academicStreams.levelType,
          color: academicStreams.color,
        })
        .from(academicStreams)
        .where(eq(academicStreams.id, grade.streamId))
        .get();

      if (!streamData) return null;

      // Fetch form
      const formData = await this.db
        .select({
          id: academicForms.id,
          name: academicForms.name,
          number: academicForms.number,
        })
        .from(academicForms)
        .where(eq(academicForms.id, grade.formId))
        .get();

      if (!formData) return null;

      // Fetch teacher (optional)
      let teacherData = null;
      if (grade.teacherId) {
        teacherData = await this.db
          .select({
            id: teachers.id,
            firstName: teachers.firstName,
            lastName: teachers.lastName,
          })
          .from(teachers)
          .where(eq(teachers.id, grade.teacherId))
          .get();
      }

      // Fetch level
      const levelData = await this.db
        .select({
          id: academicLevels.id,
          name: academicLevels.name,
          type: academicLevels.type,
        })
        .from(academicLevels)
        .where(eq(academicLevels.id, streamData.levelId))
        .get();

      return {
        ...grade,
        student,
        subject: subjectData,
        stream: streamData,
        form: formData,
        teacher: teacherData ?? null,
        level: levelData || undefined,
      };
    } catch (error) {
      console.error('Error enriching grade with relations:', error);
      return null;
    }
  }

  /**
   * Update a grade
   */
  async update(
    id: string,
    data: UpdateGradeInput
  ): Promise<SelectGrade | null> {
    try {
      const validated = UpdateGradeSchema.parse(data);
      const updateValues: Partial<InsertGrade> = {
        ...validated,
        updatedAt: Date.now(),
      };

      // Recalculate grade if score is being updated
      if (validated.score !== undefined) {
        updateValues.grade = getGradeFromScore(validated.score);
      }

      const result = await this.db
        .update(grades)
        .set(updateValues)
        .where(
          and(
            eq(grades.id, parseInt(id)),
            eq(grades.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating grade:', error);
      return null;
    }
  }

  /**
   * Delete a grade
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .update(grades)
        .set({ status: 'Archived', updatedAt: Date.now() })
        .where(
          and(
            eq(grades.id, parseInt(id)),
            eq(grades.schoolId, requireSchoolId(this.activeSchoolId)),
            ne(grades.status, 'Archived'),
          ),
        )
        .returning({ id: grades.id });

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting grade:', error);
      return false;
    }
  }
}
