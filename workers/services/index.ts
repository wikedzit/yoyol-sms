import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { drizzle } from 'drizzle-orm/d1';
import ClassService from './class';
import StudentService from './student';
import TeacherService from './teachers';
import DepartmentService from './departments';
import SubjectService from './subjects';
import TeacherSubjectService from './teacher-subjects';
import ClassSubjectService from './class-subjects';
import TeacherClassService from './teacher-classes';
import StudentSubjectService from './student-subjects';
import FacultyService from './faculties';
import CourseService from './courses';
import YearService from './years';
import SemesterService from './semesters';
import SemesterSubjectService from './semester-subjects';
import GradeService from './grades';

/**
 * Service Container that aggregates all individual services
 * Provides centralized access to all business logic services
 */
export default class ServiceContainer {
  public readonly class: ClassService;
  public readonly student: StudentService;
  public readonly teacher: TeacherService;
  public readonly department: DepartmentService;
  public readonly subject: SubjectService;
  public readonly teacherSubject: TeacherSubjectService;
  public readonly classSubject: ClassSubjectService;
  public readonly teacherClass: TeacherClassService;
  public readonly studentSubjects: StudentSubjectService;
  public readonly faculty: FacultyService;
  public readonly course: CourseService;
  public readonly year: YearService;
  public readonly semester: SemesterService;
  public readonly semesterSubject: SemesterSubjectService;
  public readonly grade: GradeService;
  private db: DrizzleD1Database;

  constructor(database: D1Database) {
    // Initialize all services with the database connection
    this.db = drizzle(database);
    this.class = new ClassService(this.db);
    // Note: StudentService is not initialized here to avoid circular dependency issues
    this.student = new StudentService(this.db);
    this.teacher = new TeacherService(this.db);
    this.department = new DepartmentService(this.db);
    this.subject = new SubjectService(this.db);
    this.teacherSubject = new TeacherSubjectService(this.db);
    this.classSubject = new ClassSubjectService(this.db);
    this.teacherClass = new TeacherClassService(this.db);
    this.studentSubjects = new StudentSubjectService(this.db);
    this.faculty = new FacultyService(this.db);
    this.course = new CourseService(this.db);
    this.year = new YearService(this.db);
    this.semester = new SemesterService(this.db);
    this.semesterSubject = new SemesterSubjectService(this.db);
    this.grade = new GradeService(this.db);
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
      subject: this.subject,
      teacherSubject: this.teacherSubject,
      classSubject: this.classSubject,
      teacherClass: this.teacherClass,
      studentSubjects: this.studentSubjects,
      faculty: this.faculty,
      course: this.course,
      year: this.year,
      semester: this.semester,
      semesterSubject: this.semesterSubject,
      grade: this.grade,
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
      subject: true, // SubjectService doesn't have async initialization
      teacherSubject: true, // TeacherSubjectService doesn't have async initialization
      classSubject: true, // ClassSubjectService doesn't have async initialization
      teacherClass: true, // TeacherClassService doesn't have async initialization
      studentSubjects: true, // StudentSubjectService doesn't have async initialization
      faculty: true, // FacultyService doesn't have async initialization
      course: true, // CourseService doesn't have async initialization
      year: true, // YearService doesn't have async initialization
      semester: true, // SemesterService doesn't have async initialization
      semesterSubject: true, // SemesterSubjectService doesn't have async initialization
      grade: true, // GradeService doesn't have async initialization
    };

    // Check if all services are available
    const allHealthy = Object.values(services).every(Boolean);

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services,
    };
  }
}
