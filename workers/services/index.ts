import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";
import ClassService from "./class";

/**
 * Service Container that aggregates all individual services
 * Provides centralized access to all business logic services
 */
export default class ServiceContainer {
	public readonly class: ClassService;
	private db: DrizzleD1Database;

	constructor(database: D1Database) {
		// Initialize all services with the database connection
		this.db = drizzle(database);
		this.class = new ClassService(this.db);
	}

	/**
	 * Get all available services
	 * Useful for debugging or service discovery
	 */
	getServices() {
		return {
			class: this.class,
		};
	}

	/**
	 * Health check for all services
	 * Can be extended to check database connectivity, etc.
	 */
	async healthCheck(): Promise<{
		status: "healthy" | "unhealthy";
		services: Record<string, boolean>;
	}> {
		const services = {
			class: true, // ClassService doesn't have async initialization
		};

		// Check if all services are available
		const allHealthy = Object.values(services).every(Boolean);

		return {
			status: allHealthy ? "healthy" : "unhealthy",
			services,
		};
	}
}
