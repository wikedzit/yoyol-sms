import { eq, and, getTableColumns } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import {
  teacherSubjects,
  teachers,
  subject,
  type SelectTeacher,
  type SelectSubject,
} from 'workers/database';
import { requireOwnerUserId, requireSchoolId } from 'workers/utils/require-owner-user';
import { schoolIdForTeacher } from './school-scope';

export default class TeacherSubjectService {
  constructor(
    private db: AppDatabase,
    private ownerUserId: number | null,
    private activeSchoolId: number | null = null,
  ) {}

  private currentOwner(): number {
    return requireOwnerUserId(this.ownerUserId);
  }

  private async teacherBelongsToOwner(teacherId: number): Promise<boolean> {
    const row = await this.db
      .select({ id: teachers.id })
      .from(teachers)
      .where(
        and(
          eq(teachers.id, teacherId),
          eq(teachers.schoolId, requireSchoolId(this.activeSchoolId)),
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
          eq(subject.schoolId, requireSchoolId(this.activeSchoolId)),
        ),
      )
      .get();

    return Boolean(row);
  }

  /**
   * Assign a subject to a teacher
   */
  async assignSubjectToTeacher(
    teacherId: number,
    subjectId: number
  ): Promise<boolean> {
    try {
      const teacherIsOwned = await this.teacherBelongsToOwner(teacherId);
      const subjectIsOwned = await this.subjectBelongsToOwner(subjectId);
      if (!teacherIsOwned || !subjectIsOwned) {
        return false;
      }
      // Check if assignment already exists
      const existing = await this.db
        .select()
        .from(teacherSubjects)
        .where(
          and(
            eq(teacherSubjects.teacherId, teacherId),
            eq(teacherSubjects.subjectId, subjectId)
          )
        )
        .get();

      if (existing) {
        console.log('Assignment already exists');
        return true;
      }

      await this.db
        .insert(teacherSubjects)
        .values({
          teacherId,
          subjectId,
          schoolId: await schoolIdForTeacher(this.db, teacherId),
          assignedAt: Date.now(),
        })
        .execute();

      return true;
    } catch (error) {
      console.error('Error assigning subject to teacher:', error);
      return false;
    }
  }

  /**
   * Remove a subject assignment from a teacher
   */
  async removeSubjectFromTeacher(
    teacherId: number,
    subjectId: number
  ): Promise<boolean> {
    try {
      const teacherIsOwned = await this.teacherBelongsToOwner(teacherId);
      if (!teacherIsOwned) {
        return false;
      }
      await this.db
        .delete(teacherSubjects)
        .where(
          and(
            eq(teacherSubjects.teacherId, teacherId),
            eq(teacherSubjects.subjectId, subjectId)
          )
        )
        .execute();

      return true;
    } catch (error) {
      console.error('Error removing subject from teacher:', error);
      return false;
    }
  }

  /**
   * Get all subjects assigned to a teacher
   */
  async getSubjectsByTeacher(teacherId: number): Promise<SelectSubject[]> {
    try {
      const results = await this.db
        .select(getTableColumns(subject))
        .from(teacherSubjects)
        .innerJoin(subject, eq(teacherSubjects.subjectId, subject.id))
        .where(
          and(
            eq(teacherSubjects.teacherId, teacherId),
            eq(subject.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .execute();

      return results;
    } catch (error) {
      console.error('Error fetching subjects for teacher:', error);
      return [];
    }
  }

  /**
   * Get all teachers assigned to a subject
   */
  async getTeachersBySubject(subjectId: number): Promise<SelectTeacher[]> {
    try {
      const results = await this.db
        .select(getTableColumns(teachers))
        .from(teacherSubjects)
        .innerJoin(teachers, eq(teacherSubjects.teacherId, teachers.id))
        .where(
          and(
            eq(teacherSubjects.subjectId, subjectId),
            eq(teachers.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .execute();

      return results;
    } catch (error) {
      console.error('Error fetching teachers for subject:', error);
      return [];
    }
  }

  /**
   * Assign multiple subjects to a teacher at once
   */
  async assignMultipleSubjects(
    teacherId: number,
    subjectIds: number[]
  ): Promise<boolean> {
    try {
      const teacherIsOwned = await this.teacherBelongsToOwner(teacherId);
      if (!teacherIsOwned) {
        return false;
      }

      for (const subjectId of subjectIds) {
        const subjectIsOwned = await this.subjectBelongsToOwner(subjectId);
        if (!subjectIsOwned) {
          return false;
        }
      }
      const schoolId = await schoolIdForTeacher(this.db, teacherId);
      const values = subjectIds.map((subjectId) => ({
        teacherId,
        subjectId,
        schoolId,
        assignedAt: Date.now(),
      }));

      await this.db.insert(teacherSubjects).values(values).execute();
      return true;
    } catch (error) {
      console.error('Error assigning multiple subjects:', error);
      return false;
    }
  }

  /**
   * Replace all subject assignments for a teacher
   */
  async replaceTeacherSubjects(
    teacherId: number,
    subjectIds: number[]
  ): Promise<boolean> {
    try {
      const teacherIsOwned = await this.teacherBelongsToOwner(teacherId);
      if (!teacherIsOwned) {
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
        .delete(teacherSubjects)
        .where(eq(teacherSubjects.teacherId, teacherId))
        .execute();

      // Insert new assignments if any
      if (subjectIds.length > 0) {
        const schoolId = await schoolIdForTeacher(this.db, teacherId);
        const values = subjectIds.map((subjectId) => ({
          teacherId,
          subjectId,
          schoolId,
          assignedAt: Date.now(),
        }));

        await this.db.insert(teacherSubjects).values(values).execute();
      }

      return true;
    } catch (error) {
      console.error('Error replacing teacher subjects:', error);
      return false;
    }
  }

  /**
   * Get teachers with their assigned subjects (with counts)
   */
  async getTeachersWithSubjectCount(): Promise<
    Array<SelectTeacher & { subjectCount: number }>
  > {
    try {
      // First get all teachers
      const allTeachers = await this.db
        .select()
        .from(teachers)
        .where(eq(teachers.schoolId, requireSchoolId(this.activeSchoolId)))
        .execute();

      // Then get subject counts for each teacher
      const teachersWithCounts = await Promise.all(
        allTeachers.map(async (teacher) => {
          const subjects = await this.getSubjectsByTeacher(teacher.id);
          return {
            ...teacher,
            subjectCount: subjects.length,
          };
        })
      );

      return teachersWithCounts;
    } catch (error) {
      console.error('Error fetching teachers with subject count:', error);
      return [];
    }
  }

  /**
   * Get subjects with their assigned teachers (with counts)
   */
  async getSubjectsWithTeacherCount(): Promise<
    Array<SelectSubject & { teacherCount: number }>
  > {
    try {
      // First get all subjects
      const allSubjects = await this.db
        .select()
        .from(subject)
        .where(eq(subject.schoolId, requireSchoolId(this.activeSchoolId)))
        .execute();

      // Then get teacher counts for each subject
      const subjectsWithCounts = await Promise.all(
        allSubjects.map(async (subj) => {
          const subjectTeachers = await this.getTeachersBySubject(subj.id);
          return {
            ...subj,
            teacherCount: subjectTeachers.length,
          };
        })
      );

      return subjectsWithCounts;
    } catch (error) {
      console.error('Error fetching subjects with teacher count:', error);
      return [];
    }
  }
}
