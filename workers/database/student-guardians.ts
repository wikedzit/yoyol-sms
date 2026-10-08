import { integer, primaryKey, sqliteTable } from 'drizzle-orm/sqlite-core';
import { guardians } from './guardians';
import { students } from './students';

// One guardian can be responsible for more than one student.
export const studentGuardians = sqliteTable(
  'student_guardians',
  {
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    guardianId: integer('guardian_id')
      .notNull()
      .references(() => guardians.id, { onDelete: 'restrict' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.studentId, table.guardianId] }),
  }),
);

export type InsertStudentGuardian = typeof studentGuardians.$inferInsert;
export type SelectStudentGuardian = typeof studentGuardians.$inferSelect;
