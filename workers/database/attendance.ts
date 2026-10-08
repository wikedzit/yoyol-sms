import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';

export const attendanceRecords = sqliteTable(
  'mod_attendance_records',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    studentId: integer('student_id').notNull(),
    formClassId: integer('form_class_id').notNull(),
    academicYearId: integer('academic_year_id').notNull(),
    termId: integer('term_id'),
    attendanceDate: text('attendance_date').notNull(),
    status: text('status').notNull(),
    comment: text('comment'),
    teacherId: integer('teacher_id'),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    createdBy: integer('created_by'),
  },
  (table) => ({
    studentDate: uniqueIndex('mod_attendance_records_student_date').on(table.studentId, table.attendanceDate),
  }),
);
