import { eq, and } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  teacherClasses,
  teachers,
  classes,
  type SelectClass,
  type SelectTeacher,
} from 'workers/database';

export default class TeacherClassService {
  constructor(private db: DrizzleD1Database) {}

  /**
   * Assign a teacher to a class
   */
  async assignTeacherToClass(
    teacherId: number,
    classId: number
  ): Promise<boolean> {
    try {
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
          assignedAt: new Date().toISOString(),
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
        .from(teacherClasses)
        .innerJoin(classes, eq(teacherClasses.classId, classes.id))
        .where(eq(teacherClasses.teacherId, teacherId))
        .execute();

      return results;
    } catch (error) {
      console.error('Error fetching classes for teacher:', error);
      return [];
    }
  }

  /**
   * Get all teachers assigned to a class
   */
  async getTeachersByClass(classId: number): Promise<SelectTeacher[]> {
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
        .from(teacherClasses)
        .innerJoin(teachers, eq(teacherClasses.teacherId, teachers.id))
        .where(eq(teacherClasses.classId, classId))
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
      // Remove duplicates
      const uniqueTeacherIds = [...new Set(teacherIds)];
      
      const values = uniqueTeacherIds.map((teacherId) => ({
        classId,
        teacherId,
        assignedAt: new Date().toISOString(),
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
          assignedAt: new Date().toISOString(),
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
          assignedAt: new Date().toISOString(),
        }));

        await this.db.insert(teacherClasses).values(values).execute();
      }

      return true;
    } catch (error) {
      console.error('Error replacing teacher classes:', error);
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
      const allTeachers = await this.db.select().from(teachers).execute();

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
      const allClasses = await this.db.select().from(classes).execute();

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

