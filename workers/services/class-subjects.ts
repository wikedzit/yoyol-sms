import { eq, and, getTableColumns } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  classSubjects,
  classes,
  subject,
  type SelectClass,
  type SelectSubject,
} from 'workers/database';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';

export default class ClassSubjectService {
  constructor(
    private db: DrizzleD1Database,
    private ownerUserId: number | null,
  ) {}

  private currentOwner(): number {
    return requireOwnerUserId(this.ownerUserId);
  }

  private async classBelongsToOwner(classId: number): Promise<boolean> {
    const row = await this.db
      .select({ id: classes.id })
      .from(classes)
      .where(
        and(
          eq(classes.id, classId),
          eq(classes.ownerUserId, this.currentOwner()),
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
   * Assign a subject to a class
   */
  async assignSubjectToClass(
    classId: number,
    subjectId: number
  ): Promise<boolean> {
    try {
      const classIsOwned = await this.classBelongsToOwner(classId);
      const subjectIsOwned = await this.subjectBelongsToOwner(subjectId);
      if (!classIsOwned || !subjectIsOwned) {
        return false;
      }
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
          assignedAt: Date.now(),
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
      const classIsOwned = await this.classBelongsToOwner(classId);
      if (!classIsOwned) {
        return false;
      }
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
        .where(
          and(
            eq(classSubjects.classId, classId),
            eq(subject.ownerUserId, this.currentOwner()),
          ),
        )
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
        .select(getTableColumns(classes))
        .from(classSubjects)
        .innerJoin(classes, eq(classSubjects.classId, classes.id))
        .where(
          and(
            eq(classSubjects.subjectId, subjectId),
            eq(classes.ownerUserId, this.currentOwner()),
          ),
        )
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
      const classIsOwned = await this.classBelongsToOwner(classId);
      if (!classIsOwned) {
        return false;
      }

      for (const subjectId of subjectIds) {
        const subjectIsOwned = await this.subjectBelongsToOwner(subjectId);
        if (!subjectIsOwned) {
          return false;
        }
      }
      // Remove duplicates
      const uniqueSubjectIds = [...new Set(subjectIds)];
      
      const values = uniqueSubjectIds.map((subjectId) => ({
        classId,
        subjectId,
        assignedAt: Date.now(),
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
      const classIsOwned = await this.classBelongsToOwner(classId);
      if (!classIsOwned) {
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
        .delete(classSubjects)
        .where(eq(classSubjects.classId, classId))
        .execute();

      // Insert new assignments if any
      if (subjectIds.length > 0) {
        const values = subjectIds.map((subjectId) => ({
          classId,
          subjectId,
          assignedAt: Date.now(),
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
      const allClasses = await this.db
        .select()
        .from(classes)
        .where(eq(classes.ownerUserId, this.currentOwner()))
        .execute();

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
      const allSubjects = await this.db
        .select()
        .from(subject)
        .where(eq(subject.ownerUserId, this.currentOwner()))
        .execute();

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

