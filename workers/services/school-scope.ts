import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { formClasses } from '../database/academic-levels';
import { students } from '../database/students';
import { teachers } from '../database/teachers';

async function schoolIdOn(
  db: AppDatabase,
  readSchoolId: Promise<{ schoolId: number | null } | undefined>,
): Promise<number | null> {
  const row = await readSchoolId;
  return row?.schoolId ?? null;
}

export function schoolIdForTeacher(
  db: AppDatabase,
  teacherId: number,
): Promise<number | null> {
  return schoolIdOn(
    db,
    db
      .select({ schoolId: teachers.schoolId })
      .from(teachers)
      .where(eq(teachers.id, teacherId))
      .get(),
  );
}

export function schoolIdForStudent(
  db: AppDatabase,
  studentId: number,
): Promise<number | null> {
  return schoolIdOn(
    db,
    db
      .select({ schoolId: students.schoolId })
      .from(students)
      .where(eq(students.id, studentId))
      .get(),
  );
}

export function schoolIdForFormClass(
  db: AppDatabase,
  formClassId: number,
): Promise<number | null> {
  return schoolIdOn(
    db,
    db
      .select({ schoolId: formClasses.schoolId })
      .from(formClasses)
      .where(eq(formClasses.id, formClassId))
      .get(),
  );
}
