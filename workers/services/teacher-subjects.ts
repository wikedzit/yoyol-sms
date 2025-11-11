import { eq, and } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  teacherSubjects,
  teachers,
  subject,
  type SelectTeacher,
  type SelectSubject,
} from 'workers/database';

export default class TeacherSubjectService {
  constructor(private db: DrizzleD1Database) {}

  /**
   * Assign a subject to a teacher
   */
  async assignSubjectToTeacher(
    teacherId: number,
    subjectId: number
  ): Promise<boolean> {
    try {
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
          assignedAt: new Date().toISOString(),
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
        .from(teacherSubjects)
        .innerJoin(subject, eq(teacherSubjects.subjectId, subject.id))
        .where(eq(teacherSubjects.teacherId, teacherId))
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
        .select({
          id: teachers.id,
          firstName: teachers.firstName,
          lastName: teachers.lastName,
          subject: teachers.subject,
          email: teachers.email,
          phone: teachers.phone,
          address: teachers.address,
          qualification: teachers.qualification,
          gender: teachers.gender,
          experience: teachers.experience,
          status: teachers.status,
          departmentId: teachers.departmentId,
          createdAt: teachers.createdAt,
          updatedAt: teachers.updatedAt,
        })
        .from(teacherSubjects)
        .innerJoin(teachers, eq(teacherSubjects.teacherId, teachers.id))
        .where(eq(teacherSubjects.subjectId, subjectId))
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
      const values = subjectIds.map((subjectId) => ({
        teacherId,
        subjectId,
        assignedAt: new Date().toISOString(),
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
      // Delete all existing assignments
      await this.db
        .delete(teacherSubjects)
        .where(eq(teacherSubjects.teacherId, teacherId))
        .execute();

      // Insert new assignments if any
      if (subjectIds.length > 0) {
        const values = subjectIds.map((subjectId) => ({
          teacherId,
          subjectId,
          assignedAt: new Date().toISOString(),
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
      const allTeachers = await this.db.select().from(teachers).execute();

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
      const allSubjects = await this.db.select().from(subject).execute();

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
