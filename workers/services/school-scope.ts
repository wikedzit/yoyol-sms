import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { formClasses } from '../database/academic-levels';
import { classes } from '../database/class';
import { school } from '../database/school';
import { students } from '../database/students';
import { teachers } from '../database/teachers';

// Used while owner_user_id is still the filter on every screen.
// A single school can be stamped onto new rows. Several schools stay unset
// until the school switcher chooses one.
export async function schoolIdForOwner(
  db: AppDatabase,
  ownerUserId: number,
): Promise<number | null> {
  const schools = await db
    .select({ id: school.id })
    .from(school)
    .where(eq(school.ownerUserId, ownerUserId))
    .limit(2);

  if (schools.length === 1) {
    return schools[0].id;
  }

  return null;
}

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

export function schoolIdForClass(
  db: AppDatabase,
  classId: number,
): Promise<number | null> {
  return schoolIdOn(
    db,
    db
      .select({ schoolId: classes.schoolId })
      .from(classes)
      .where(eq(classes.id, classId))
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
