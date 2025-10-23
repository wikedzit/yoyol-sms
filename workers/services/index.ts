import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { drizzle } from 'drizzle-orm/d1';
import ClassService from './class';
import StudentService from './student';
import TeacherService from './teachers';
import DepartmentService from './departments';

/**
 * Service Container that aggregates all individual services
 * Provides centralized access to all business logic services
 */
export default class ServiceContainer {
  public readonly class: ClassService;
  public readonly student: StudentService;
  public readonly teacher: TeacherService;
  public readonly department: DepartmentService;
  private db: DrizzleD1Database;

  constructor(database: D1Database) {
    // Initialize all services with the database connection
    this.db = drizzle(database);
    this.class = new ClassService(this.db);
    // Note: StudentService is not initialized here to avoid circular dependency issues
    this.student = new StudentService(this.db);
    this.teacher = new TeacherService(this.db);
    this.department = new DepartmentService(this.db);
  }

  /**
   * Get all available services
   * Useful for debugging or service discovery
   */
  getServices() {
    return {
      class: this.class,
      student: this.student,
      teacher: this.teacher,
      department: this.department,
    };
  }

  /**
   * Health check for all services
   * Can be extended to check database connectivity, etc.
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: Record<string, boolean>;
  }> {
    const services = {
      class: true, // ClassService doesn't have async initialization
      student: true, // StudentService doesn't have async initialization
      teacher: true, // TeacherService doesn't have async initialization
      department: true, // DepartmentService doesn't have async initialization
    };

    // Check if all services are available
    const allHealthy = Object.values(services).every(Boolean);

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services,
    };
  }
}
