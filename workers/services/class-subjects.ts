import { eq, and, getTableColumns } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  classSubjects,
  classes,
  subject,
  type SelectClass,
  type SelectSubject,
} from 'workers/database';

export default class ClassSubjectService {
  constructor(private db: DrizzleD1Database) {}

  /**
   * Assign a subject to a class
   */
  async assignSubjectToClass(
    classId: number,
    subjectId: number
  ): Promise<boolean> {
    try {
      // Check if assignment already exists
      const existing = await this.db
        .select()
        .from(classSubjects)
        .where(
          and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.subjectId, subjectId)
          )
        )
        .get();

      if (existing) {
        console.log('Assignment already exists');
        return true;
      }

      await this.db
        .insert(classSubjects)
        .values({
          classId,
          subjectId,
          assignedAt: new Date().toISOString(),
        })
        .execute();

      return true;
    } catch (error) {
      console.error('Error assigning subject to class:', error);
      return false;
    }
  }

  /**
   * Remove a subject assignment from a class
   */
  async removeSubjectFromClass(
    classId: number,
    subjectId: number
  ): Promise<boolean> {
    try {
      await this.db
        .delete(classSubjects)
        .where(
          and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.subjectId, subjectId)
          )
        )
        .execute();

      return true;
    } catch (error) {
      console.error('Error removing subject from class:', error);
      return false;
    }
  }

  /**
   * Get all subjects assigned to a class
   */
  async getSubjectsByClass(classId: number): Promise<SelectSubject[]> {
    try {
      const results = await this.db
        .select(getTableColumns(subject))
        .from(classSubjects)
        .innerJoin(subject, eq(classSubjects.subjectId, subject.id))
        .where(eq(classSubjects.classId, classId))
        .execute();

      return results;
    } catch (error) {
      console.error('Error fetching subjects for class:', error);
      return [];
    }
  }

  /**
   * Get all classes assigned to a subject
   */
  async getClassesBySubject(subjectId: number): Promise<SelectClass[]> {
    try {
      const results = await this.db
        .select({
          id: classes.id,
          name: classes.name,
          EducationalLevel: classes.EducationalLevel,
          section: classes.section,
          year: classes.year,
          departmentId: classes.departmentId,
          createdAt: classes.createdAt,
          updatedAt: classes.updatedAt,
        })
        .from(classSubjects)
        .innerJoin(classes, eq(classSubjects.classId, classes.id))
        .where(eq(classSubjects.subjectId, subjectId))
        .execute();

      return results;
    } catch (error) {
      console.error('Error fetching classes for subject:', error);
      return [];
    }
  }

  /**
   * Assign multiple subjects to a class at once
   */
  async assignMultipleSubjects(
    classId: number,
    subjectIds: number[]
  ): Promise<boolean> {
    try {
      // Remove duplicates
      const uniqueSubjectIds = [...new Set(subjectIds)];
      
      const values = uniqueSubjectIds.map((subjectId) => ({
        classId,
        subjectId,
        assignedAt: new Date().toISOString(),
      }));

      if (values.length > 0) {
        await this.db.insert(classSubjects).values(values).execute();
      }
      return true;
    } catch (error) {
      console.error('Error assigning multiple subjects:', error);
      return false;
    }
  }

  /**
   * Replace all subject assignments for a class
   */
  async replaceClassSubjects(
    classId: number,
    subjectIds: number[]
  ): Promise<boolean> {
    try {
      // Delete all existing assignments
      await this.db
        .delete(classSubjects)
        .where(eq(classSubjects.classId, classId))
        .execute();

      // Insert new assignments if any
      if (subjectIds.length > 0) {
        const values = subjectIds.map((subjectId) => ({
          classId,
          subjectId,
          assignedAt: new Date().toISOString(),
        }));

        await this.db.insert(classSubjects).values(values).execute();
      }

      return true;
    } catch (error) {
      console.error('Error replacing class subjects:', error);
      return false;
    }
  }

  /**
   * Get classes with their assigned subjects (with counts)
   */
  async getClassesWithSubjectCount(): Promise<
    Array<SelectClass & { subjectCount: number }>
  > {
    try {
      // First get all classes
      const allClasses = await this.db.select().from(classes).execute();

      // Then get subject counts for each class
      const classesWithCounts = await Promise.all(
        allClasses.map(async (classItem) => {
          const subjects = await this.getSubjectsByClass(classItem.id);
          return {
            ...classItem,
            subjectCount: subjects.length,
          };
        })
      );

      return classesWithCounts;
    } catch (error) {
      console.error('Error fetching classes with subject count:', error);
      return [];
    }
  }

  /**
   * Get subjects with their assigned classes (with counts)
   */
  async getSubjectsWithClassCount(): Promise<
    Array<SelectSubject & { classCount: number }>
  > {
    try {
      // First get all subjects
      const allSubjects = await this.db.select().from(subject).execute();

      // Then get class counts for each subject
      const subjectsWithCounts = await Promise.all(
        allSubjects.map(async (subj) => {
          const subjectClasses = await this.getClassesBySubject(subj.id);
          return {
            ...subj,
            classCount: subjectClasses.length,
          };
        })
      );

      return subjectsWithCounts;
    } catch (error) {
      console.error('Error fetching subjects with class count:', error);
      return [];
    }
  }
}

