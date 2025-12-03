import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { students } from './students';
import { subject } from './subjects';
import { academicStreams, academicForms } from './academic-levels';
import { teachers } from './teachers';

export const grades = sqliteTable('grades', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Foreign Keys
  studentId: integer('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  subjectId: integer('subject_id')
    .notNull()
    .references(() => subject.id, { onDelete: 'cascade' }),
  streamId: integer('stream_id')
    .notNull()
    .references(() => academicStreams.id, { onDelete: 'cascade' }),
  formId: integer('form_id')
    .notNull()
    .references(() => academicForms.id, { onDelete: 'cascade' }),
  teacherId: integer('teacher_id').references(() => teachers.id, {
    onDelete: 'set null',
  }),
  // Grade data
  score: integer('score').notNull(), // 0-100
  grade: text('grade').notNull(), // A, B, C, D, F
  remarks: text('remarks'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type InsertGrade = typeof grades.$inferInsert;
export type SelectGrade = typeof grades.$inferSelect;
