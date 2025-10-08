import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const classes = sqliteTable("classes", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	name: text("name").notNull(),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer("updated_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
});

export type InsertClass = typeof classes.$inferInsert;
export type SelectClass = typeof classes.$inferSelect;
