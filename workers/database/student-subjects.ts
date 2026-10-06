import { integer, sqliteTable, primaryKey } from 'drizzle-orm/sqlite-core';
import { school } from './school';
import { students } from './students';
import { subject } from './subjects';
import { sql } from 'drizzle-orm';

//table schema
export const studentSubjects = sqliteTable(
  'student_subjects',
  {
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    subjectId: integer('subject_id')
      .notNull()
      .references(() => subject.id, { onDelete: 'cascade' }),
    schoolId: integer('school_id').references(() => school.id, {
      onDelete: 'set null',
    }),
    assignedAt: integer('assigned_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    // Composite primary key
    pk: primaryKey({ columns: [table.studentId, table.subjectId] }),
  })
);
