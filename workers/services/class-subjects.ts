import { eq, and } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { subject } from 'workers/database';
import { formClasses } from 'workers/database/academic-levels';
import { formClassSubjects } from 'workers/database/form-class-subjects';
import { requireSchoolId } from 'workers/utils/require-owner-user';

export default class ClassSubjectService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
  ) {}

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

  async getClassesBySubject(subjectId: number): Promise<{ id: number; name: string }[]> {
    const rows = await this.db
      .select({ id: formClasses.id, name: formClasses.name })
      .from(formClassSubjects)
      .innerJoin(formClasses, eq(formClassSubjects.formClassId, formClasses.id))
      .where(and(
        eq(formClassSubjects.subjectId, subjectId),
        eq(formClasses.schoolId, requireSchoolId(this.activeSchoolId)),
      ));
    return rows;
  }

  async subjectIdsForFormClass(formClassId: number): Promise<number[]> {
    const owned = await this.formClassBelongsToSchool(formClassId);
    if (!owned) {
      return [];
    }
    const rows = await this.db
      .select({ subjectId: formClassSubjects.subjectId })
      .from(formClassSubjects)
      .where(and(
        eq(formClassSubjects.formClassId, formClassId),
        eq(formClassSubjects.schoolId, requireSchoolId(this.activeSchoolId)),
      ));
    return rows.map((row) => row.subjectId);
  }

  async replaceFormClassSubjects(formClassId: number, subjectIds: number[]): Promise<boolean> {
    const owned = await this.formClassBelongsToSchool(formClassId);
    if (!owned) {
      return false;
    }
    const uniqueSubjectIds = [...new Set(subjectIds)];
    for (const subjectId of uniqueSubjectIds) {
      const subjectIsOwned = await this.subjectBelongsToOwner(subjectId);
      if (!subjectIsOwned) {
        return false;
      }
    }

    const schoolId = requireSchoolId(this.activeSchoolId);
    await this.db
      .delete(formClassSubjects)
      .where(and(
        eq(formClassSubjects.formClassId, formClassId),
        eq(formClassSubjects.schoolId, schoolId),
      ));

    if (uniqueSubjectIds.length === 0) {
      return true;
    }

    await this.db.insert(formClassSubjects).values(uniqueSubjectIds.map((subjectId) => ({
      formClassId,
      subjectId,
      schoolId,
      assignedAt: Date.now(),
    })));
    return true;
  }

  private async formClassBelongsToSchool(formClassId: number): Promise<boolean> {
    const row = await this.db
      .select({ id: formClasses.id })
      .from(formClasses)
      .where(and(
        eq(formClasses.id, formClassId),
        eq(formClasses.schoolId, requireSchoolId(this.activeSchoolId)),
      ))
      .get();
    return Boolean(row);
  }
}
