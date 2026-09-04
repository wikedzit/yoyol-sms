import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

/**
 * LEGACY: University-style classes table
 *
 * This schema is from the original university-level structure.
 * For the new school-based structure (O-Level/A-Level), use:
 * - `academicLevels` - O-Level, A-Level
 * - `academicStreams` - Science, Arts, Business
 * - `academicForms` - Form 1-6
 * - `formClasses` - Actual classroom sections (3A, 3B, etc.)
 *
 * See: workers/database/academic-levels.ts
 *
 * @deprecated Use formClasses from academic-levels.ts for new school features
 */
export const classes = sqliteTable('classes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  EducationalLevel: text('level').notNull(),
  section: text('section').default('General'),
  year: integer('year').notNull(),
  // Legacy field - kept for backwards compatibility
  departmentId: integer('department_id'),
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

export type InsertClass = typeof classes.$inferInsert;
export type SelectClass = typeof classes.$inferSelect;
