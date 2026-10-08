import { eq, and } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import {
  teacherFormClasses,
  teachers,
  formClasses,
  type SelectFormClass,
} from 'workers/database';
import { requireSchoolId } from 'workers/utils/require-owner-user';
import { schoolIdForTeacher } from './school-scope';

export default class TeacherClassService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
  ) {}

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
            eq(formClasses.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .execute();
    } catch (error) {
      console.error('Error fetching form classes for teacher:', error);
      return [];
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
              eq(formClasses.schoolId, requireSchoolId(this.activeSchoolId)),
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
        const schoolId = await schoolIdForTeacher(this.db, teacherId);
        await this.db.insert(teacherFormClasses).values(
          formClassIds.map((formClassId) => ({
            teacherId,
            formClassId,
            schoolId,
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
}
