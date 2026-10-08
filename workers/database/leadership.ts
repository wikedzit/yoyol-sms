import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';

const schoolColumns = {
  schoolId: integer('school_id').notNull().references(() => school.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  createdBy: integer('created_by'),
};

export const leadershipPositions = sqliteTable('mod_leadership_positions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  retired: integer('retired', { mode: 'boolean' }).notNull(),
  ...schoolColumns,
}, (table) => ({
  schoolName: uniqueIndex('mod_leadership_positions_school_name').on(table.schoolId, table.name),
}));

export const leadershipAppointments = sqliteTable('mod_leadership_appointments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  positionId: integer('position_id').notNull(),
  studentId: integer('student_id').notNull(),
  academicYearId: integer('academic_year_id').notNull(),
  startsOn: text('starts_on').notNull(),
  endsOn: text('ends_on').notNull(),
  ended: integer('ended', { mode: 'boolean' }).notNull(),
  ...schoolColumns,
});
