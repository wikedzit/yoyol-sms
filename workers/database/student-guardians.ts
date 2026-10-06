import { integer, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { school } from './school';
import { students } from './students';
import { users } from './users';

export const studentGuardians = sqliteTable(
  'student_guardians',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    schoolId: integer('school_id')
      .notNull()
      .references(() => school.id, { onDelete: 'cascade' }),
    studentId: integer('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('student_guardians_student_user').on(table.studentId, table.userId),
  ],
);
