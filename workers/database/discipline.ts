import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';

const schoolColumns = {
  schoolId: integer('school_id').notNull().references(() => school.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  createdBy: integer('created_by'),
};

export const disciplineTypes = sqliteTable('mod_discipline_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull(),
  ...schoolColumns,
}, (table) => ({
  schoolName: uniqueIndex('mod_discipline_types_school_name').on(table.schoolId, table.name),
}));

export const disciplineSeverities = sqliteTable('mod_discipline_severities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull(),
  ...schoolColumns,
}, (table) => ({
  schoolName: uniqueIndex('mod_discipline_severities_school_name').on(table.schoolId, table.name),
}));

export const disciplineIncidents = sqliteTable('mod_discipline_incidents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studentId: integer('student_id').notNull(),
  typeId: integer('type_id').notNull(),
  severityId: integer('severity_id').notNull(),
  teacherId: integer('teacher_id'),
  description: text('description').notNull(),
  actionTaken: text('action_taken').notNull(),
  incidentDate: text('incident_date').notNull(),
  closed: integer('closed', { mode: 'boolean' }).notNull(),
  ...schoolColumns,
});
