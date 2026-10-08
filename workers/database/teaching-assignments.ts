import { integer, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { academicYears } from './academic-years';
import { formClasses } from './academic-levels';
import { school } from './school';
import { subject } from './subjects';
import { teachers } from './teachers';

export const teachingAssignments = sqliteTable(
  'teaching_assignments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id, { onDelete: 'cascade' }),
    teacherId: integer('teacher_id')
      .notNull()
      .references(() => teachers.id, { onDelete: 'cascade' }),
    academicYearId: integer('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subject.id, { onDelete: 'cascade' }),
    formClassId: integer('form_class_id')
      .notNull()
      .references(() => formClasses.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    uniqueAssignment: uniqueIndex('teaching_assignments_unique').on(
      table.teacherId,
      table.academicYearId,
      table.subjectId,
      table.formClassId,
    ),
  }),
);
