import { eq, desc, asc, like } from "drizzle-orm";
import { z } from "zod";
import { classes, type InsertClass, type SelectClass } from "../database/class";
import type { DrizzleD1Database } from "drizzle-orm/d1";

// Zod schemas for validation
const CreateClassSchema = z.object({
	name: z
		.string()
		.min(1, "Class name is required")
		.max(100, "Class name too long"),
});

const UpdateClassSchema = z.object({
	name: z
		.string()
		.min(1, "Class name is required")
		.max(100, "Class name too long")
		.optional(),
});

const GetClassesSchema = z
	.object({
		limit: z.number().min(1).max(100).default(50),
		offset: z.number().min(0).default(0),
		sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt"),
		sortOrder: z.enum(["asc", "desc"]).default("desc"),
		search: z.string().optional(),
	})
	.optional();

export type CreateClassInput = z.infer<typeof CreateClassSchema>;
export type UpdateClassInput = z.infer<typeof UpdateClassSchema>;
export type GetClassesInput = z.infer<typeof GetClassesSchema>;

/**
 * Simple service class for managing classes
 */
export default class ClassService {
	private db: DrizzleD1Database;

	constructor(database: DrizzleD1Database) {
		this.db = database;
	}

	/**
	 * Create a new class
	 */
	async create(data: CreateClassInput): Promise<SelectClass | null> {
		try {
			const validatedData = CreateClassSchema.parse(data);

			const result = await this.db
				.insert(classes)
				.values({
					name: validatedData.name,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				})
				.returning();

			return result[0] || null;
		} catch (error) {
			console.error("Error creating class:", error);
			return null;
		}
	}

	/**
	 * Get class by ID
	 */
	async getById(id: number): Promise<SelectClass | null> {
		try {
			const result = await this.db
				.select()
				.from(classes)
				.where(eq(classes.id, id))
				.get();

			return result || null;
		} catch (error) {
			console.error("Error fetching class:", error);
			return null;
		}
	}

	/**
	 * Get all classes with optional filters
	 */
	async getAll(options: GetClassesInput): Promise<SelectClass[]> {
		try {
			const { limit, offset, sortBy, sortOrder, search } =
				GetClassesSchema.parse(options) ?? {};

			// Get the correct column for sorting
			const sortColumn =
				sortBy === "name"
					? classes.name
					: sortBy === "createdAt"
					? classes.createdAt
					: classes.updatedAt;

			if (search) {
				const result = await this.db
					.select()
					.from(classes)
					.where(like(classes.name, `%${search}%`))
					.orderBy(
						sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn)
					)
					.limit(limit ?? 10)
					.offset(offset ?? 0);
				return result;
			} else {
				const result = await this.db
					.select()
					.from(classes)
					.orderBy(
						sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn)
					)
					.limit(limit ?? 10)
					.offset(offset ?? 0);
				return result;
			}
		} catch (error) {
			console.error("Error fetching classes:", error);
			return [];
		}
	}

	/**
	 * Update class
	 */
	async update(
		id: number,
		data: UpdateClassInput
	): Promise<SelectClass | null> {
		try {
			const validatedData = UpdateClassSchema.parse(data);

			const updateValues: Partial<InsertClass> = {
				...validatedData,
				updatedAt: Date.now(),
			};

			const result = await this.db
				.update(classes)
				.set(updateValues)
				.where(eq(classes.id, id))
				.returning();

			return result[0] || null;
		} catch (error) {
			console.error("Error updating class:", error);
			return null;
		}
	}

	/**
	 * Delete class
	 */
	async delete(id: number): Promise<boolean> {
		try {
			const result = await this.db
				.delete(classes)
				.where(eq(classes.id, id))
				.returning({ id: classes.id });

			return result.length > 0;
		} catch (error) {
			console.error("Error deleting class:", error);
			return false;
		}
	}

	/**
	 * Check if class exists by name
	 */
	async exists(name: string): Promise<boolean> {
		try {
			const result = await this.db
				.select({ id: classes.id })
				.from(classes)
				.where(eq(classes.name, name))
				.get();

			return result !== null;
		} catch (error) {
			console.error("Error checking class existence:", error);
			return false;
		}
	}
}
