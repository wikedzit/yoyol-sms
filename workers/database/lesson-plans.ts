import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';

const schoolColumns = {
  schoolId: integer('school_id').notNull().references(() => school.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  createdBy: integer('created_by'),
};

export const lessonTemplates = sqliteTable('mod_lesson_plans_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  body: text('body').notNull(),
  retired: integer('retired', { mode: 'boolean' }).notNull(),
  ...schoolColumns,
}, (table) => ({
  schoolName: uniqueIndex('mod_lesson_plans_templates_school_name').on(table.schoolId, table.name),
}));

export const lessonPlans = sqliteTable('mod_lesson_plans_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  templateId: integer('template_id').notNull(),
  academicYearId: integer('academic_year_id').notNull(),
  formClassId: integer('form_class_id').notNull(),
  subjectId: integer('subject_id').notNull(),
  teacherId: integer('teacher_id').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull(),
  reviewComment: text('review_comment').notNull(),
  ...schoolColumns,
});
