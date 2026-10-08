import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { academicLevels } from './academic-levels';
import { academicYears, terms } from './academic-years';
import { school } from './school';
import { students } from './students';
import { subject } from './subjects';
import { teachers } from './teachers';

export const assessmentTypes = sqliteTable(
  'assessment_types',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => ({
    schoolKey: uniqueIndex('assessment_types_school_key').on(table.schoolId, table.key),
  }),
);

export const gradingScales = sqliteTable('grading_scales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  schoolId: integer('school_id')
    .notNull()
    .references(() => school.id, { onDelete: 'cascade' }),
  levelId: integer('level_id')
    .notNull()
    .references(() => academicLevels.id, { onDelete: 'cascade' }),
  minScore: integer('min_score').notNull(),
  maxScore: integer('max_score').notNull(),
  label: text('label').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const results = sqliteTable(
  'results',
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
    termId: integer('term_id')
      .notNull()
      .references(() => terms.id, { onDelete: 'cascade' }),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subject.id, { onDelete: 'cascade' }),
    assessmentTypeId: integer('assessment_type_id')
      .notNull()
      .references(() => assessmentTypes.id, { onDelete: 'cascade' }),
    teacherId: integer('teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
    score: integer('score').notNull(),
    gradeLabel: text('grade_label').notNull(),
    comment: text('comment'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    oneEntry: uniqueIndex('results_one_entry').on(
      table.studentId,
      table.termId,
      table.subjectId,
      table.assessmentTypeId,
    ),
  }),
);

export const resultReleases = sqliteTable(
  'result_releases',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id, { onDelete: 'cascade' }),
    termId: integer('term_id')
      .notNull()
      .references(() => terms.id, { onDelete: 'cascade' }),
    releasedAt: integer('released_at'),
  },
  (table) => ({
    schoolTerm: uniqueIndex('result_releases_school_term').on(table.schoolId, table.termId),
  }),
);
