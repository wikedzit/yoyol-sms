import { eq, and, getTableColumns } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  teacherClasses,
  teacherFormClasses,
  teachers,
  classes,
  formClasses,
  type SelectClass,
  type SelectFormClass,
  type SelectTeacher,
} from 'workers/database';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';

export default class TeacherClassService {
  constructor(
    private db: DrizzleD1Database,
    private ownerUserId: number | null,
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
          eq(teachers.ownerUserId, this.currentOwner()),
        ),
      )
      .get();

    return Boolean(row);
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

  /**
   * Assign a teacher to a class
   */
  async assignTeacherToClass(
    teacherId: number,
    classId: number
  ): Promise<boolean> {
    try {
      const teacherIsOwned = await this.teacherBelongsToOwner(teacherId);
      const classIsOwned = await this.classBelongsToOwner(classId);
      if (!teacherIsOwned || !classIsOwned) {
        return false;
      }
      // Check if assignment already exists
      const existing = await this.db
        .select()
        .from(teacherClasses)
        .where(
          and(
            eq(teacherClasses.teacherId, teacherId),
            eq(teacherClasses.classId, classId)
          )
        )
        .get();

      if (existing) {
        console.log('Assignment already exists');
        return true;
      }

      await this.db
        .insert(teacherClasses)
        .values({
          teacherId,
          classId,
          assignedAt: Date.now(),
        })
        .execute();

      return true;
    } catch (error) {
      console.error('Error assigning teacher to class:', error);
      return false;
    }
  }

  /**
   * Remove a teacher assignment from a class
   */
  async removeTeacherFromClass(
    teacherId: number,
    classId: number
  ): Promise<boolean> {
    try {
      const teacherIsOwned = await this.teacherBelongsToOwner(teacherId);
      if (!teacherIsOwned) {
        return false;
      }
      await this.db
        .delete(teacherClasses)
        .where(
          and(
            eq(teacherClasses.teacherId, teacherId),
            eq(teacherClasses.classId, classId)
          )
        )
        .execute();

      return true;
    } catch (error) {
      console.error('Error removing teacher from class:', error);
      return false;
    }
  }

  /**
   * Get all classes assigned to a teacher
   */
  async getClassesByTeacher(teacherId: number): Promise<SelectClass[]> {
    try {
      const results = await this.db
        .select(getTableColumns(classes))
        .from(teacherClasses)
        .innerJoin(classes, eq(teacherClasses.classId, classes.id))
        .where(
          and(
            eq(teacherClasses.teacherId, teacherId),
            eq(classes.ownerUserId, this.currentOwner()),
          ),
        )
        .execute();

      return results;
    } catch (error) {
      console.error('Error fetching classes for teacher:', error);
      return [];
    }
  }

  async getFormClassesByTeacher(teacherId: number): Promise<SelectFormClass[]> {
    try {
      return await this.db
        .select({
          id: formClasses.id,
          name: formClasses.name,
          formId: formClasses.formId,
          streamId: formClasses.streamId,
          levelId: formClasses.levelId,
          studentCount: formClasses.studentCount,
          schoolId: formClasses.schoolId,
          campusId: formClasses.campusId,
          ownerUserId: formClasses.ownerUserId,
          createdAt: formClasses.createdAt,
          updatedAt: formClasses.updatedAt,
        })
        .from(teacherFormClasses)
        .innerJoin(
          formClasses,
          eq(teacherFormClasses.formClassId, formClasses.id),
        )
        .where(
          and(
            eq(teacherFormClasses.teacherId, teacherId),
            eq(formClasses.ownerUserId, this.currentOwner()),
          ),
        )
        .execute();
    } catch (error) {
      console.error('Error fetching form classes for teacher:', error);
      return [];
    }
  }

  /**
   * Get all teachers assigned to a class
   */
  async getTeachersByClass(classId: number): Promise<SelectTeacher[]> {
    try {
      const results = await this.db
        .select(getTableColumns(teachers))
        .from(teacherClasses)
        .innerJoin(teachers, eq(teacherClasses.teacherId, teachers.id))
        .where(
          and(
            eq(teacherClasses.classId, classId),
            eq(teachers.ownerUserId, this.currentOwner()),
          ),
        )
        .execute();

      return results;
    } catch (error) {
      console.error('Error fetching teachers for class:', error);
      return [];
    }
  }

  /**
   * Assign multiple teachers to a class at once
   */
  async assignMultipleTeachers(
    classId: number,
    teacherIds: number[]
  ): Promise<boolean> {
    try {
      const classIsOwned = await this.classBelongsToOwner(classId);
      if (!classIsOwned) {
        return false;
      }

      for (const teacherId of teacherIds) {
        const teacherIsOwned = await this.teacherBelongsToOwner(teacherId);
        if (!teacherIsOwned) {
          return false;
        }
      }
      // Remove duplicates
      const uniqueTeacherIds = [...new Set(teacherIds)];
      
      const values = uniqueTeacherIds.map((teacherId) => ({
        classId,
        teacherId,
        assignedAt: Date.now(),
      }));

      if (values.length > 0) {
        await this.db.insert(teacherClasses).values(values).execute();
      }
      return true;
    } catch (error) {
      console.error('Error assigning multiple teachers:', error);
      return false;
    }
  }

  /**
   * Replace all teacher assignments for a class
   */
  async replaceClassTeachers(
    classId: number,
    teacherIds: number[]
  ): Promise<boolean> {
    try {
      const classIsOwned = await this.classBelongsToOwner(classId);
      if (!classIsOwned) {
        return false;
      }

      for (const teacherId of teacherIds) {
        const teacherIsOwned = await this.teacherBelongsToOwner(teacherId);
        if (!teacherIsOwned) {
          return false;
        }
      }
      // Delete all existing assignments
      await this.db
        .delete(teacherClasses)
        .where(eq(teacherClasses.classId, classId))
        .execute();

      // Insert new assignments if any
      if (teacherIds.length > 0) {
        const values = teacherIds.map((teacherId) => ({
          classId,
          teacherId,
          assignedAt: Date.now(),
        }));

        await this.db.insert(teacherClasses).values(values).execute();
      }

      return true;
    } catch (error) {
      console.error('Error replacing class teachers:', error);
      return false;
    }
  }

  /**
   * Replace all class assignments for a teacher
   */
  async replaceTeacherClasses(
    teacherId: number,
    classIds: number[]
  ): Promise<boolean> {
    try {
      const teacherIsOwned = await this.teacherBelongsToOwner(teacherId);
      if (!teacherIsOwned) {
        return false;
      }

      for (const classId of classIds) {
        const classIsOwned = await this.classBelongsToOwner(classId);
        if (!classIsOwned) {
          return false;
        }
      }
      // Delete all existing assignments
      await this.db
        .delete(teacherClasses)
        .where(eq(teacherClasses.teacherId, teacherId))
        .execute();

      // Insert new assignments if any
      if (classIds.length > 0) {
        const values = classIds.map((classId) => ({
          teacherId,
          classId,
          assignedAt: Date.now(),
        }));

        await this.db.insert(teacherClasses).values(values).execute();
      }

      return true;
    } catch (error) {
      console.error('Error replacing teacher classes:', error);
      return false;
    }
  }

  async replaceTeacherFormClasses(
    teacherId: number,
    formClassIds: number[],
  ): Promise<boolean> {
    try {
      if (!(await this.teacherBelongsToOwner(teacherId))) return false;

      for (const formClassId of formClassIds) {
        const formClass = await this.db
          .select({ id: formClasses.id })
          .from(formClasses)
          .where(
            and(
              eq(formClasses.id, formClassId),
              eq(formClasses.ownerUserId, this.currentOwner()),
            ),
          )
          .get();
        if (!formClass) return false;
      }

      await this.db
        .delete(teacherFormClasses)
        .where(eq(teacherFormClasses.teacherId, teacherId))
        .execute();

      if (formClassIds.length > 0) {
        await this.db.insert(teacherFormClasses).values(
          formClassIds.map((formClassId) => ({
            teacherId,
            formClassId,
            assignedAt: Date.now(),
          })),
        ).execute();
      }

      return true;
    } catch (error) {
      console.error('Error replacing teacher form class assignments:', error);
      return false;
    }
  }

  /**
   * Get teachers with their assigned classes (with counts)
   */
  async getTeachersWithClassCount(): Promise<
    Array<SelectTeacher & { classCount: number }>
  > {
    try {
      // First get all teachers
      const allTeachers = await this.db
        .select()
        .from(teachers)
        .where(eq(teachers.ownerUserId, this.currentOwner()))
        .execute();

      // Then get class counts for each teacher
      const teachersWithCounts = await Promise.all(
        allTeachers.map(async (teacher) => {
          const classes = await this.getClassesByTeacher(teacher.id);
          return {
            ...teacher,
            classCount: classes.length,
          };
        })
      );

      return teachersWithCounts;
    } catch (error) {
      console.error('Error fetching teachers with class count:', error);
      return [];
    }
  }

  /**
   * Get classes with their assigned teachers (with counts)
   */
  async getClassesWithTeacherCount(): Promise<
    Array<SelectClass & { teacherCount: number }>
  > {
    try {
      // First get all classes
      const allClasses = await this.db
        .select()
        .from(classes)
        .where(eq(classes.ownerUserId, this.currentOwner()))
        .execute();

      // Then get teacher counts for each class
      const classesWithCounts = await Promise.all(
        allClasses.map(async (classItem) => {
          const teachers = await this.getTeachersByClass(classItem.id);
          return {
            ...classItem,
            teacherCount: teachers.length,
          };
        })
      );

      return classesWithCounts;
    } catch (error) {
      console.error('Error fetching classes with teacher count:', error);
      return [];
    }
  }
}

