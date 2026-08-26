import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { drizzle } from 'drizzle-orm/d1';
import ClassService from './class';
import StudentService from './student';
import TeacherService from './teachers';
import SubjectService from './subjects';
import TeacherSubjectService from './teacher-subjects';
import ClassSubjectService from './class-subjects';
import TeacherClassService from './teacher-classes';
import StudentSubjectService from './student-subjects';
import GradeService from './grades';
import NoticeService from './notices';
import LoginService from './auth.server';
import AcademicLevelService from './academic-levels';
import SchoolService from './school';
import AcademicYearService from './academic-years';

/**
 * Service Container that aggregates all individual services
 * Provides centralized access to all business logic services
 */
export default class ServiceContainer {
  public readonly users: LoginService;
  public readonly class: ClassService;
  public readonly student: StudentService;
  public readonly teacher: TeacherService;
  public readonly subject: SubjectService;
  public readonly teacherSubject: TeacherSubjectService;
  public readonly classSubject: ClassSubjectService;
  public readonly teacherClass: TeacherClassService;
  public readonly studentSubjects: StudentSubjectService;
  public readonly grade: GradeService;
  public readonly notice: NoticeService;
  public readonly academicLevel: AcademicLevelService;
  public readonly school: SchoolService;
  public readonly academicYear: AcademicYearService;
  private db: DrizzleD1Database;

  constructor(database: D1Database, jwtSecret: string) {
    // Initialize all services with the database connection
    this.db = drizzle(database);
    this.users = new LoginService(this.db, jwtSecret);
    this.class = new ClassService(this.db);
    this.student = new StudentService(this.db);
    this.teacher = new TeacherService(this.db);
    this.subject = new SubjectService(this.db);
    this.teacherSubject = new TeacherSubjectService(this.db);
    this.classSubject = new ClassSubjectService(this.db);
    this.teacherClass = new TeacherClassService(this.db);
    this.studentSubjects = new StudentSubjectService(this.db);
    this.grade = new GradeService(this.db);
    this.notice = new NoticeService(this.db);
    this.academicLevel = new AcademicLevelService(this.db);
    this.school = new SchoolService(this.db);
    this.academicYear = new AcademicYearService(this.db);
  }

  /**
   * Get all available services
   * Useful for debugging or service discovery
   */
  getServices() {
    return {
      users: this.users,
      class: this.class,
      student: this.student,
      teacher: this.teacher,
      subject: this.subject,
      teacherSubject: this.teacherSubject,
      classSubject: this.classSubject,
      teacherClass: this.teacherClass,
      studentSubjects: this.studentSubjects,
      grade: this.grade,
      notice: this.notice,
      academicLevel: this.academicLevel,
      school: this.school,
      academicYear: this.academicYear,
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
      users: true,
      class: true,
      student: true,
      teacher: true,
      subject: true,
      teacherSubject: true,
      classSubject: true,
      teacherClass: true,
      studentSubjects: true,
      grade: true,
      notice: true,
      academicLevel: true,
      school: true,
      academicYear: true,
    };

    // Check if all services are available
    const allHealthy = Object.values(services).every(Boolean);

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services,
    };
  }
}