import { eq, desc, asc, and, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  grades,
  type InsertGrade,
  type SelectGrade,
} from '../database/grades';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { students } from '../database/students';
import { subject } from '../database/subjects';
import { semesters } from '../database/semesters';
import { teachers } from '../database/teachers';
import { classes } from '../database/class';
import { departments } from '../database/departments';
import { faculties } from '../database/faculties';
import { courses } from '../database/courses';
import { years } from '../database/years';

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
  semesterId: z.number().min(1, 'Semester is required'),
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
    semesterId: z.number().optional(),
    teacherId: z.number().optional(),
    facultyId: z.number().optional(),
    departmentId: z.number().optional(),
    yearId: z.number().optional(),
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
    departmentId: number;
  };
  semester: {
    id: number;
    name: string;
    semesterNumber: number;
    yearId: number;
  };
  teacher: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
  year?: {
    id: number;
    name: string;
    yearNumber: number;
    courseId: number;
  };
  department?: {
    id: number;
    name: string;
    facultyId: number | null;
  };
  faculty?: {
    id: number;
    name: string;
  };
};

/**
 * Grades Service Class
 */
export default class GradeService {
  private db: DrizzleD1Database;

  constructor(database: DrizzleD1Database) {
    this.db = database;
  }

  /**
   * Create a new grade
   */
  async create(data: CreateGradeInput): Promise<SelectGrade | null> {
    try {
      const validated = CreateGradeSchema.parse(data);
      const grade = getGradeFromScore(validated.score);

      const result = await this.db
        .insert(grades)
        .values({
          ...validated,
          grade,
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
      const grade = await this.db
        .select()
        .from(grades)
        .where(eq(grades.id, parseInt(id)))
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
      const {
        limit,
        offset,
        sortBy,
        sortOrder,
        studentId,
        subjectId,
        semesterId,
        teacherId,
        facultyId,
        departmentId,
        yearId,
      } = GetGradesSchema.parse(options) ?? {};

      // Build where conditions
      const conditions = [];
      if (studentId) conditions.push(eq(grades.studentId, studentId));
      if (subjectId) conditions.push(eq(grades.subjectId, subjectId));
      if (semesterId) conditions.push(eq(grades.semesterId, semesterId));
      if (teacherId) conditions.push(eq(grades.teacherId, teacherId));

      // Handle complex filters (faculty, department, year)
      let gradeIds: number[] | null = null;
      if (facultyId || departmentId || yearId) {
        // Get filtered grade IDs based on relationships
        const allGrades = await this.db.select().from(grades).all();
        const filteredGrades = await Promise.all(
          allGrades.map(async (g) => {
            const enriched = await this.enrichGradeWithRelations(g);
            if (!enriched) return null;

            if (facultyId && enriched.faculty?.id !== facultyId) return null;
            if (departmentId && enriched.department?.id !== departmentId)
              return null;
            if (yearId && enriched.year?.id !== yearId) return null;

            return g.id;
          })
        );
        gradeIds = filteredGrades.filter(
          (id): id is number => id !== null
        ) as number[];
        if (gradeIds.length === 0) return [];
      }

      let query = this.db.select().from(grades);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      if (gradeIds) {
        query = query.where(inArray(grades.id, gradeIds)) as any;
      }

      // Sort
      const sortColumn =
        sortBy === 'score'
          ? grades.score
          : sortBy === 'grade'
          ? grades.grade
          : sortBy === 'createdAt'
          ? grades.createdAt
          : grades.updatedAt;

      const results = await query
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit ?? 50)
        .offset(offset ?? 0);

      // Enrich with relations
      return Promise.all(
        results.map((grade) => this.enrichGradeWithRelations(grade))
      );
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
          departmentId: subject.departmentId,
        })
        .from(subject)
        .where(eq(subject.id, grade.subjectId))
        .get();

      if (!subjectData) return null;

      // Fetch semester
      const semesterData = await this.db
        .select({
          id: semesters.id,
          name: semesters.name,
          semesterNumber: semesters.semesterNumber,
          yearId: semesters.yearId,
        })
        .from(semesters)
        .where(eq(semesters.id, grade.semesterId))
        .get();

      if (!semesterData) return null;

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

      // Fetch year
      const yearData = await this.db
        .select()
        .from(years)
        .where(eq(years.id, semesterData.yearId))
        .get();

      // Fetch department
      const departmentData = await this.db
        .select()
        .from(departments)
        .where(eq(departments.id, subjectData.departmentId))
        .get();

      // Fetch faculty
      let facultyData = null;
      if (departmentData?.facultyId) {
        facultyData = await this.db
          .select()
          .from(faculties)
          .where(eq(faculties.id, departmentData.facultyId))
          .get();
      }

      return {
        ...grade,
        student,
        subject: subjectData,
        semester: semesterData,
        teacher: teacherData,
        year: yearData || undefined,
        department: departmentData || undefined,
        faculty: facultyData || undefined,
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
        .where(eq(grades.id, parseInt(id)))
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
        .delete(grades)
        .where(eq(grades.id, parseInt(id)))
        .returning({ id: grades.id });

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting grade:', error);
      return false;
    }
  }
}

