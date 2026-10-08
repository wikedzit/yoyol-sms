import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { drizzle } from 'drizzle-orm/d1';
import SchoolAccess from './school-access';
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
import AuthService from './auth.server';
import AcademicLevelService from './academic-levels';
import SchoolService from './school';
import AcademicYearService from './academic-years';
import CampusService from './campus';

/**
 * Service Container that aggregates all individual services
 * Provides centralized access to all business logic services
 */
export default class ServiceContainer {
  public readonly users: AuthService;
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
  public readonly campus: CampusService;
  public readonly schoolAccess: SchoolAccess;
  private db: DrizzleD1Database;

  constructor(
    database: D1Database,
    jwtSecret: string,
    ownerUserId: number | null = null,
  ) {
    this.db = drizzle(database);
    this.schoolAccess = new SchoolAccess(this.db, ownerUserId);
    this.users = new AuthService(this.db, jwtSecret);
    this.class = new ClassService(this.db, this.schoolAccess);
    this.student = new StudentService(this.db, this.schoolAccess);
    this.teacher = new TeacherService(this.db, this.schoolAccess);
    this.subject = new SubjectService(this.db, this.schoolAccess);
    this.teacherSubject = new TeacherSubjectService(this.db, this.schoolAccess);
    this.classSubject = new ClassSubjectService(this.db, this.schoolAccess);
    this.teacherClass = new TeacherClassService(this.db, this.schoolAccess);
    this.studentSubjects = new StudentSubjectService(this.db, this.schoolAccess);
    this.grade = new GradeService(this.db, this.schoolAccess);
    this.notice = new NoticeService(this.db, this.schoolAccess);
    this.academicLevel = new AcademicLevelService(this.db, this.schoolAccess);
    this.school = new SchoolService(this.db, ownerUserId, this.schoolAccess);
    this.academicYear = new AcademicYearService(this.db, this.schoolAccess);
    this.campus = new CampusService(this.db, this.schoolAccess);
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
      campus: this.campus,
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
      campus: true,
    };

    // Check if all services are available
    const allHealthy = Object.values(services).every(Boolean);

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services,
    };
  }
}