// import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
// import { sql } from 'drizzle-orm';

// export const users = sqliteTable('users', {
//   id: integer('id').primaryKey({ autoIncrement: true }),
//   email: text('email').notNull().unique(),
//   password: text('password').notNull(),
//   createdAt: integer('created_at')
//     .notNull()
//     .default(sql`CURRENT_TIMESTAMP`),
//   updatedAt: integer('updated_at')
//     .notNull()
//     .default(sql`CURRENT_TIMESTAMP`),
// });

// export type InsertUser = typeof users.$inferInsert;
// export type SelectUser = typeof users.$inferSelect;
