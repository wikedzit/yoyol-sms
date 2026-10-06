import type { AppDatabase } from '../database/app-database';
import { eq, and, getTableColumns } from 'drizzle-orm';
import {
  studentSubjects,
  subject,
  students,
  type SelectSubject,
} from 'workers/database';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';
import { schoolIdForStudent } from './school-scope';

export default class StudentSubjectService {
  constructor(
    private db: AppDatabase,
    private ownerUserId: number | null,
  ) {}

  private currentOwner(): number {
    return requireOwnerUserId(this.ownerUserId);
  }

  private async studentBelongsToOwner(studentId: number): Promise<boolean> {
    const row = await this.db
      .select({ id: students.id })
      .from(students)
      .where(
        and(
          eq(students.id, studentId),
          eq(students.ownerUserId, this.currentOwner()),
        ),
      )
      .get();

    return Boolean(row);
  }

  private async subjectBelongsToOwner(subjectId: number): Promise<boolean> {
    const row = await this.db
      .select({ id: subject.id })
      .from(subject)
      .where(
        and(
          eq(subject.id, subjectId),
          eq(subject.ownerUserId, this.currentOwner()),
        ),
      )
      .get();

    return Boolean(row);
  }

  /**
   * Assign a subject to a student
   */
  async assignSubjectToStudent(
    studentId: number,
    subjectId: number
  ): Promise<boolean> {
    try {
      const studentIsOwned = await this.studentBelongsToOwner(studentId);
      const subjectIsOwned = await this.subjectBelongsToOwner(subjectId);
      if (!studentIsOwned || !subjectIsOwned) {
        return false;
      }
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
          schoolId: await schoolIdForStudent(this.db, studentId),
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
      const studentIsOwned = await this.studentBelongsToOwner(studentId);
      if (!studentIsOwned) {
        return false;
      }
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
      const studentIsOwned = await this.studentBelongsToOwner(studentId);
      if (!studentIsOwned) {
        return [];
      }
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
        .select(getTableColumns(subject))
        .from(studentSubjects)
        .innerJoin(subject, eq(studentSubjects.subjectId, subject.id))
        .where(
          and(
            eq(studentSubjects.studentId, studentId),
            eq(subject.ownerUserId, this.currentOwner()),
          ),
        )
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
      const subjectIsOwned = await this.subjectBelongsToOwner(subjectId);
      if (!subjectIsOwned) {
        return [];
      }
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
      const studentIsOwned = await this.studentBelongsToOwner(studentId);
      if (!studentIsOwned) {
        return false;
      }

      for (const subjectId of subjectIds) {
        const subjectIsOwned = await this.subjectBelongsToOwner(subjectId);
        if (!subjectIsOwned) {
          return false;
        }
      }
      const schoolId = await schoolIdForStudent(this.db, studentId);
      const assignments = subjectIds.map((subjectId) => ({
        studentId,
        subjectId,
        schoolId,
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
      const subjectIsOwned = await this.subjectBelongsToOwner(subjectId);
      if (!subjectIsOwned) {
        return false;
      }

      for (const studentId of studentIds) {
        const studentIsOwned = await this.studentBelongsToOwner(studentId);
        if (!studentIsOwned) {
          return false;
        }
      }
      const assignments = await Promise.all(
        studentIds.map(async (studentId) => ({
          studentId,
          subjectId,
          schoolId: await schoolIdForStudent(this.db, studentId),
          assignedAt: Date.now(),
        })),
      );

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
      const studentIsOwned = await this.studentBelongsToOwner(studentId);
      if (!studentIsOwned) {
        return false;
      }

      for (const subjectId of subjectIds) {
        const subjectIsOwned = await this.subjectBelongsToOwner(subjectId);
        if (!subjectIsOwned) {
          return false;
        }
      }
      // Delete all existing assignments
      await this.db
        .delete(studentSubjects)
        .where(eq(studentSubjects.studentId, studentId))
        .execute();

      // Insert new assignments if any
      if (subjectIds.length > 0) {
        const schoolId = await schoolIdForStudent(this.db, studentId);
        const values = subjectIds.map((subjectId) => ({
          studentId,
          subjectId,
          schoolId,
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
      const subjectIsOwned = await this.subjectBelongsToOwner(subjectId);
      if (!subjectIsOwned) {
        return false;
      }

      for (const studentId of studentIds) {
        const studentIsOwned = await this.studentBelongsToOwner(studentId);
        if (!studentIsOwned) {
          return false;
        }
      }
      // Delete all existing assignments
      await this.db
        .delete(studentSubjects)
        .where(eq(studentSubjects.subjectId, subjectId))
        .execute();

      // Insert new assignments if any
      if (studentIds.length > 0) {
        const values = await Promise.all(
          studentIds.map(async (studentId) => ({
            studentId,
            subjectId,
            schoolId: await schoolIdForStudent(this.db, studentId),
            assignedAt: Date.now(),
          })),
        );

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
