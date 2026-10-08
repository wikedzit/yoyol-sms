import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { formClasses } from './academic-levels';
import { academicYears } from './academic-years';
import { school } from './school';
import { students } from './students';

export const studentEnrolments = sqliteTable(
  'student_enrolments',
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
    formClassId: integer('form_class_id').references(() => formClasses.id, { onDelete: 'set null' }),
    status: text('status').notNull().default('enrolled'),
    moveReason: text('move_reason'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    studentYear: uniqueIndex('student_enrolments_student_year').on(table.studentId, table.academicYearId),
  }),
);
