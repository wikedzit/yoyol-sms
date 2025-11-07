import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { studentSubjects, subject, type SelectSubject } from 'workers/database';

export default class StudentSubjectService {
  constructor(private db: DrizzleD1Database) {}

  /**
   * Assign a subject to a student
   */
  async assignSubjectToStudent(
    studentId: number,
    subjectId: number
  ): Promise<boolean> {
    try {
      // Check if assignment already exists
      const existing = await this.db
        .select()
        .from(studentSubjects)
        .where(
          and(
            eq(studentSubjects.studentId, studentId),
            eq(studentSubjects.subjectId, subjectId)
          )
        )
        .get();

      if (existing) {
        console.log('Assignment already exists');
        return true;
      }

      await this.db
        .insert(studentSubjects)
        .values({
          studentId,
          subjectId,
          assignedAt: Date.now(),
        })
        .execute();

      return true;
    } catch (error) {
      console.error('Error assigning subject to student:', error);
      return false;
    }
  }

  /**
   * Remove a subject assignment from a student
   */
  async removeSubjectFromStudent(
    studentId: number,
    subjectId: number
  ): Promise<boolean> {
    try {
      await this.db
        .delete(studentSubjects)
        .where(
          and(
            eq(studentSubjects.studentId, studentId),
            eq(studentSubjects.subjectId, subjectId)
          )
        )
        .execute();

      return true;
    } catch (error) {
      console.error('Error removing subject from student:', error);
      return false;
    }
  }
  //get all subjects for a student (returns IDs only)
  async getSubjectsForStudent(studentId: number): Promise<number[]> {
    try {
      const subjects = await this.db
        .select()
        .from(studentSubjects)
        .where(eq(studentSubjects.studentId, studentId))
        .all();

      return subjects.map((s) => s.subjectId);
    } catch (error) {
      console.error('Error fetching subjects for student:', error);
      return [];
    }
  }

  //get all subjects for a student (returns full subject objects)
  async getSubjectsByStudent(studentId: number): Promise<SelectSubject[]> {
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
        .from(studentSubjects)
        .innerJoin(subject, eq(studentSubjects.subjectId, subject.id))
        .where(eq(studentSubjects.studentId, studentId))
        .execute();

      return results;
    } catch (error) {
      console.error('Error fetching subjects for student:', error);
      return [];
    }
  }

  //get all students for a subject
  async getStudentsForSubject(subjectId: number): Promise<number[]> {
    try {
      const students = await this.db
        .select()
        .from(studentSubjects)
        .where(eq(studentSubjects.subjectId, subjectId))
        .all();

      return students.map((s) => s.studentId);
    } catch (error) {
      console.error('Error fetching students for subject:', error);
      return [];
    }
  }

  //assign multiple subjects to a student
  async assignMultipleSubjectsToStudent(
    studentId: number,
    subjectIds: number[]
  ): Promise<boolean> {
    try {
      const assignments = subjectIds.map((subjectId) => ({
        studentId,
        subjectId,
        assignedAt: Date.now(),
      }));

      await this.db.insert(studentSubjects).values(assignments).execute();

      return true;
    } catch (error) {
      console.error('Error assigning multiple subjects to student:', error);
      return false;
    }
  }

  //assign multiple students to a subject
  async assignMultipleStudentsToSubject(
    subjectId: number,
    studentIds: number[]
  ): Promise<boolean> {
    try {
      const assignments = studentIds.map((studentId) => ({
        studentId,
        subjectId,
        assignedAt: Date.now(),
      }));

      await this.db.insert(studentSubjects).values(assignments).execute();

      return true;
    } catch (error) {
      console.error('Error assigning multiple students to subject:', error);
      return false;
    }
  }

  // Replace all subject assignments for a student
  async replaceStudentSubjects(
    studentId: number,
    subjectIds: number[]
  ): Promise<boolean> {
    try {
      // Delete all existing assignments
      await this.db
        .delete(studentSubjects)
        .where(eq(studentSubjects.studentId, studentId))
        .execute();

      // Insert new assignments if any
      if (subjectIds.length > 0) {
        const values = subjectIds.map((subjectId) => ({
          studentId,
          subjectId,
          assignedAt: Date.now(),
        }));

        await this.db.insert(studentSubjects).values(values).execute();
      }

      return true;
    } catch (error) {
      console.error('Error replacing student subjects:', error);
      return false;
    }
  }

  // Replace all student assignments for a subject
  async replaceSubjectStudents(
    subjectId: number,
    studentIds: number[]
  ): Promise<boolean> {
    try {
      // Delete all existing assignments
      await this.db
        .delete(studentSubjects)
        .where(eq(studentSubjects.subjectId, subjectId))
        .execute();

      // Insert new assignments if any
      if (studentIds.length > 0) {
        const values = studentIds.map((studentId) => ({
          studentId,
          subjectId,
          assignedAt: Date.now(),
        }));

        await this.db.insert(studentSubjects).values(values).execute();
      }

      return true;
    } catch (error) {
      console.error('Error replacing subject students:', error);
      return false;
    }
  }

  // End of class
}
