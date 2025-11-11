import { eq, and } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  semesterSubjects,
  semesters,
  subject,
  type SelectSemester,
  type SelectSubject,
} from 'workers/database';

export default class SemesterSubjectService {
  constructor(private db: DrizzleD1Database) {}

  /**
   * Assign a subject to a semester
   */
  async assignSubjectToSemester(
    semesterId: number,
    subjectId: number
  ): Promise<boolean> {
    try {
      // Check if assignment already exists
      const existing = await this.db
        .select()
        .from(semesterSubjects)
        .where(
          and(
            eq(semesterSubjects.semesterId, semesterId),
            eq(semesterSubjects.subjectId, subjectId)
          )
        )
        .get();

      if (existing) {
        console.log('Assignment already exists');
        return true;
      }

      await this.db
        .insert(semesterSubjects)
        .values({
          semesterId,
          subjectId,
          assignedAt: Date.now(),
        })
        .execute();

      return true;
    } catch (error) {
      console.error('Error assigning subject to semester:', error);
      return false;
    }
  }

  /**
   * Remove a subject assignment from a semester
   */
  async removeSubjectFromSemester(
    semesterId: number,
    subjectId: number
  ): Promise<boolean> {
    try {
      await this.db
        .delete(semesterSubjects)
        .where(
          and(
            eq(semesterSubjects.semesterId, semesterId),
            eq(semesterSubjects.subjectId, subjectId)
          )
        )
        .execute();

      return true;
    } catch (error) {
      console.error('Error removing subject from semester:', error);
      return false;
    }
  }

  /**
   * Get all subjects assigned to a semester
   */
  async getSubjectsBySemester(semesterId: number): Promise<SelectSubject[]> {
    try {
      const results = await this.db
        .select({
          id: subject.id,
          subjectName: subject.subjectName,
          code: subject.code,
          departments: subject.departments,
          instructor: subject.instructor,
          description: subject.description,
          enrolledStudents: subject.enrolledStudents,
          status: subject.status,
          departmentId: subject.departmentId,
          createdAt: subject.createdAt,
          updatedAt: subject.updatedAt,
        })
        .from(semesterSubjects)
        .innerJoin(subject, eq(semesterSubjects.subjectId, subject.id))
        .where(eq(semesterSubjects.semesterId, semesterId))
        .execute();

      return results;
    } catch (error) {
      console.error('Error fetching subjects for semester:', error);
      return [];
    }
  }

  /**
   * Get all semesters assigned to a subject
   */
  async getSemestersBySubject(subjectId: number): Promise<SelectSemester[]> {
    try {
      const results = await this.db
        .select({
          id: semesters.id,
          semesterNumber: semesters.semesterNumber,
          name: semesters.name,
          description: semesters.description,
          yearId: semesters.yearId,
          createdAt: semesters.createdAt,
          updatedAt: semesters.updatedAt,
        })
        .from(semesterSubjects)
        .innerJoin(semesters, eq(semesterSubjects.semesterId, semesters.id))
        .where(eq(semesterSubjects.subjectId, subjectId))
        .execute();

      return results;
    } catch (error) {
      console.error('Error fetching semesters for subject:', error);
      return [];
    }
  }

  /**
   * Assign multiple subjects to a semester at once
   */
  async assignMultipleSubjects(
    semesterId: number,
    subjectIds: number[]
  ): Promise<boolean> {
    try {
      // Remove duplicates
      const uniqueSubjectIds = [...new Set(subjectIds)];
      
      const values = uniqueSubjectIds.map((subjectId) => ({
        semesterId,
        subjectId,
        assignedAt: Date.now(),
      }));

      if (values.length > 0) {
        await this.db.insert(semesterSubjects).values(values).execute();
      }
      return true;
    } catch (error) {
      console.error('Error assigning multiple subjects:', error);
      return false;
    }
  }

  /**
   * Replace all subject assignments for a semester
   */
  async replaceSemesterSubjects(
    semesterId: number,
    subjectIds: number[]
  ): Promise<boolean> {
    try {
      // Delete all existing assignments
      await this.db
        .delete(semesterSubjects)
        .where(eq(semesterSubjects.semesterId, semesterId))
        .execute();

      // Insert new assignments if any
      if (subjectIds.length > 0) {
        const values = subjectIds.map((subjectId) => ({
          semesterId,
          subjectId,
          assignedAt: Date.now(),
        }));

        await this.db.insert(semesterSubjects).values(values).execute();
      }

      return true;
    } catch (error) {
      console.error('Error replacing semester subjects:', error);
      return false;
    }
  }
}

