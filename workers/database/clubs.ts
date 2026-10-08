import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';

const schoolColumns = {
  schoolId: integer('school_id').notNull().references(() => school.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  createdBy: integer('created_by'),
};

export const clubs = sqliteTable('mod_clubs_clubs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  patronId: integer('patron_id').notNull(),
  closed: integer('closed', { mode: 'boolean' }).notNull(),
  ...schoolColumns,
}, (table) => ({
  schoolName: uniqueIndex('mod_clubs_clubs_school_name').on(table.schoolId, table.name),
}));

export const clubMemberships = sqliteTable('mod_clubs_memberships', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clubId: integer('club_id').notNull(),
  studentId: integer('student_id').notNull(),
  academicYearId: integer('academic_year_id').notNull(),
  ...schoolColumns,
});

export const clubActivities = sqliteTable('mod_clubs_activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clubId: integer('club_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  activityDate: text('activity_date').notNull(),
  teacherId: integer('teacher_id'),
  ...schoolColumns,
});
