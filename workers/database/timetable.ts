import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';

const schoolColumns = {
  schoolId: integer('school_id').notNull().references(() => school.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  createdBy: integer('created_by'),
};

export const timetablePeriods = sqliteTable('mod_timetable_periods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  startsAt: text('starts_at').notNull(),
  endsAt: text('ends_at').notNull(),
  ...schoolColumns,
}, (table) => ({
  schoolName: uniqueIndex('mod_timetable_periods_school_name').on(table.schoolId, table.name),
}));

export const timetableEntries = sqliteTable('mod_timetable_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  academicYearId: integer('academic_year_id').notNull(),
  formClassId: integer('form_class_id').notNull(),
  subjectId: integer('subject_id').notNull(),
  teacherId: integer('teacher_id').notNull(),
  day: text('day').notNull(),
  periodId: integer('period_id').notNull(),
  ...schoolColumns,
});
