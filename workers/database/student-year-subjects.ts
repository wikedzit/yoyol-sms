import { integer, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { academicYears } from './academic-years';
import { school } from './school';
import { students } from './students';
import { subject } from './subjects';
import { subjectCombinations } from './subject-combinations';

export const studentYearSubjects = sqliteTable(
  'student_year_subjects',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id, { onDelete: 'cascade' }),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    academicYearId: integer('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subject.id, { onDelete: 'cascade' }),
    combinationId: integer('combination_id').references(() => subjectCombinations.id, { onDelete: 'set null' }),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    studentYearSubject: uniqueIndex('student_year_subjects_unique').on(
      table.studentId,
      table.academicYearId,
      table.subjectId,
    ),
  }),
);
