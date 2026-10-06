import { sql } from 'drizzle-orm';
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { campus } from './campuses';
import { school } from './school';
import { users } from './users';

// Academic Levels table (O-Level, A-Level)
export const academicLevels = sqliteTable(
  'academic_levels',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(), // "O-Level", "A-Level"
    type: text('type').notNull(), // "o-level", "a-level"
    description: text('description'),
    schoolId: integer('school_id').references(() => school.id, {
      onDelete: 'set null',
    }),
    ownerUserId: integer('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    ownerTypeUnique: uniqueIndex('academic_levels_owner_type_unique').on(
      table.ownerUserId,
      table.type,
    ),
  }),
);

// Streams table (Science, Arts, Business)
export const academicStreams = sqliteTable('academic_streams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // "Science", "Arts", "Business"
  levelId: integer('level_id')
    .notNull()
    .references(() => academicLevels.id, { onDelete: 'cascade' }),
  levelType: text('level_type').notNull(), // "o-level", "a-level"
  color: text('color').notNull(), // "science", "arts", "business" - used for styling
  schoolId: integer('school_id').references(() => school.id, {
    onDelete: 'set null',
  }),
  ownerUserId: integer('owner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Forms table (Form 1-6)
export const academicForms = sqliteTable('academic_forms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // "Form 1", "Form 2", etc.
  number: integer('number').notNull(), // 1, 2, 3, 4, 5, 6
  streamId: integer('stream_id')
    .notNull()
    .references(() => academicStreams.id, { onDelete: 'cascade' }),
  levelId: integer('level_id')
    .notNull()
    .references(() => academicLevels.id, { onDelete: 'cascade' }),
  schoolId: integer('school_id').references(() => school.id, {
    onDelete: 'set null',
  }),
  ownerUserId: integer('owner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Form Classes table (3A, 3B, 3C, etc.)
export const formClasses = sqliteTable('form_classes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // "3A", "3B", etc.
  formId: integer('form_id')
    .notNull()
    .references(() => academicForms.id, { onDelete: 'cascade' }),
  streamId: integer('stream_id')
    .notNull()
    .references(() => academicStreams.id, { onDelete: 'cascade' }),
  levelId: integer('level_id')
    .notNull()
    .references(() => academicLevels.id, { onDelete: 'cascade' }),
  studentCount: integer('student_count').notNull().default(0),
  schoolId: integer('school_id').references(() => school.id, {
    onDelete: 'set null',
  }),
  campusId: integer('campus_id').references(() => campus.id, {
    onDelete: 'set null',
  }),
  ownerUserId: integer('owner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Export types for TypeScript
export type InsertAcademicLevel = typeof academicLevels.$inferInsert;
export type SelectAcademicLevel = typeof academicLevels.$inferSelect;

export type InsertAcademicStream = typeof academicStreams.$inferInsert;
export type SelectAcademicStream = typeof academicStreams.$inferSelect;

export type InsertAcademicForm = typeof academicForms.$inferInsert;
export type SelectAcademicForm = typeof academicForms.$inferSelect;

export type InsertFormClass = typeof formClasses.$inferInsert;
export type SelectFormClass = typeof formClasses.$inferSelect;

