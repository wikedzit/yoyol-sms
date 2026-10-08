import { sql } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { createD1Adapter } from '../database/d1-adapter';
import { bundledExtensionHost } from '../kernel/bundled-host';
import { healthReport, type HealthReport } from '../kernel/health';
import StudentService from './student';
import TeacherService from './teachers';
import SubjectService from './subjects';
import TeacherSubjectService from './teacher-subjects';
import ClassSubjectService from './class-subjects';
import TeacherClassService from './teacher-classes';
import StudentSubjectService from './student-subjects';
import StudentYearSubjectService from './student-year-subjects';
import StudentPortalService from './student-portal';
import StaffRecordService from './staff-records';
import AssessmentRecordService from './assessment-records';
import CalendarEventService from './calendar-events';
import AttendanceRecordService from './attendance';
import FinanceRecordService from './finance';
import ClubService from './clubs';
import LeadershipService from './leadership';
import ReportsService from './reports';
import PublisherService from './publishers';
import ChannelService from './channels';
import { localesFor } from '../kernel/bundled-locales';
import DisciplineService from './discipline';
import LessonPlanService from './lesson-plans';
import TimetableService from './timetable';
import GradeService from './grades';
import NoticeService from './notices';
import AuthService from './auth.server';
import AcademicLevelService from './academic-levels';
import SchoolService from './school';
import AcademicYearService from './academic-years';
import CampusService from './campus';
import SchoolThemeService from './school-themes';
import TenancyService from './tenancy';
import ExtensionService from './extensions';
import EventService from './events';
import CoreReadService from './core-reads';
import SettingsService from './settings';
import AuditService from './audit';
import PersonDataService from './person-data';
import RetentionService from './retention';
import SubjectCombinationService from './subject-combinations';
import StudentEnrolmentService from './student-enrolments';
import GuardianService from './guardians';
import NotificationService from './notifications';
import AccessService from './access';
import RecordScopeService from './record-scope';
import SessionService from './sessions';
import InvitationService from './invitations';
import PasswordResetService from './password-resets';

/**
 * Service Container that aggregates all individual services
 * Provides centralized access to all business logic services
 */
export default class ServiceContainer {
  public readonly users: AuthService;
  public readonly student: StudentService;
  public readonly teacher: TeacherService;
  public readonly subject: SubjectService;
  public readonly teacherSubject: TeacherSubjectService;
  public readonly classSubject: ClassSubjectService;
  public readonly combinations: SubjectCombinationService;
  public readonly enrolments: StudentEnrolmentService;
  public readonly guardians: GuardianService;
  public readonly teacherClass: TeacherClassService;
  public readonly studentSubjects: StudentSubjectService;
  public readonly yearSubjects: StudentYearSubjectService;
  public readonly portal: StudentPortalService;
  public readonly staff: StaffRecordService;
  public readonly assessment: AssessmentRecordService;
  public readonly calendar: CalendarEventService;
  public readonly attendance: AttendanceRecordService;
  public readonly finance: FinanceRecordService;
  public readonly timetable: TimetableService;
  public readonly lessonPlans: LessonPlanService;
  public readonly discipline: DisciplineService;
  public readonly clubs: ClubService;
  public readonly leadership: LeadershipService;
  public readonly reports: ReportsService;
  public readonly channels: ChannelService;
  public readonly publishers: PublisherService;
  public readonly grade: GradeService;
  public readonly notice: NoticeService;
  public readonly academicLevel: AcademicLevelService;
  public readonly school: SchoolService;
  public readonly academicYear: AcademicYearService;
  public readonly campus: CampusService;
  public readonly schoolThemes: SchoolThemeService;
  public readonly tenancy: TenancyService;
  public readonly extensions: ExtensionService;
  public readonly events: EventService;
  public readonly coreReads: CoreReadService;
  public readonly settings: SettingsService;
  public readonly audit: AuditService;
  public readonly personData: PersonDataService;
  public readonly retention: RetentionService;
  public readonly notifications: NotificationService;
  public readonly currentUserId: number | null;
  public readonly requestId: string;
  public readonly access: AccessService;
  public readonly recordScope: RecordScopeService;
  public readonly sessions: SessionService;
  public readonly invitations: InvitationService;
  public readonly passwordResets: PasswordResetService;
  private db: AppDatabase;

  constructor(
    database: D1Database,
    jwtSecret: string,
    ownerUserId: number | null = null,
    activeSchoolId: number | null = null,
    requestId = 'none',
  ) {
    this.currentUserId = ownerUserId;
    this.requestId = requestId;
    const adapter = createD1Adapter(database);
    this.db = adapter.db;
    this.users = new AuthService(this.db, jwtSecret);
    this.events = new EventService(
      this.db,
      (schoolId, extensionKey) => this.extensions.contextFor(schoolId, extensionKey),
      requestId,
    );
    this.student = new StudentService(adapter, ownerUserId, activeSchoolId, () => this.events.dispatchDue());
    this.teacher = new TeacherService(this.db, ownerUserId, activeSchoolId);
    this.subject = new SubjectService(this.db, ownerUserId, activeSchoolId);
    this.teacherSubject = new TeacherSubjectService(this.db, ownerUserId, activeSchoolId);
    this.classSubject = new ClassSubjectService(this.db, activeSchoolId);
    this.combinations = new SubjectCombinationService(this.db, activeSchoolId);
    this.enrolments = new StudentEnrolmentService(this.db, activeSchoolId);
    this.guardians = new GuardianService(this.db, activeSchoolId);
    this.teacherClass = new TeacherClassService(this.db, activeSchoolId);
    this.studentSubjects = new StudentSubjectService(this.db, ownerUserId, activeSchoolId);
    this.yearSubjects = new StudentYearSubjectService(this.db, activeSchoolId);
    this.portal = new StudentPortalService(this.db, activeSchoolId, ownerUserId);
    this.staff = new StaffRecordService(this.db, activeSchoolId, ownerUserId);
    this.assessment = new AssessmentRecordService(this.db, activeSchoolId);
    this.grade = new GradeService(adapter, ownerUserId, activeSchoolId, () => this.events.dispatchDue());
    this.notice = new NoticeService(this.db, ownerUserId, activeSchoolId);
    this.academicLevel = new AcademicLevelService(this.db, ownerUserId, activeSchoolId);
    this.school = new SchoolService(this.db, ownerUserId);
    this.academicYear = new AcademicYearService(this.db, ownerUserId, activeSchoolId, (input) => this.events.publish(
      input.schoolId,
      'academics.term.started',
      { termId: input.termId, academicYearId: input.academicYearId },
    ));
    this.campus = new CampusService(this.db, ownerUserId, activeSchoolId);
    this.schoolThemes = new SchoolThemeService(this.db, ownerUserId, activeSchoolId);
    this.tenancy = new TenancyService(this.db, ownerUserId);
    this.coreReads = new CoreReadService(this.db);
    this.notifications = new NotificationService(this.db);
    this.calendar = new CalendarEventService(this.db, activeSchoolId, (input) => this.notifications.notifyUser({
      schoolId: input.schoolId,
      userId: input.userId,
      title: input.title,
      body: input.body,
      extensionKey: 'notices',
    }));
    this.extensions = new ExtensionService(adapter, ownerUserId, activeSchoolId, {
      listStudents: (schoolId, extensionKey) => this.coreReads.listStudents(schoolId, extensionKey),
      listStudentRecords: (schoolId, extensionKey) => this.coreReads.listStudentRecords(schoolId, extensionKey),
      listStudentEnrolments: (schoolId, extensionKey) => this.coreReads.listStudentEnrolments(schoolId, extensionKey),
      listGuardianLinks: (schoolId, extensionKey) => this.coreReads.listGuardianLinks(schoolId, extensionKey),
      listStudentYearSubjects: (schoolId, extensionKey) => this.coreReads.listStudentYearSubjects(schoolId, extensionKey),
      listAcademics: (schoolId, extensionKey) => this.coreReads.listAcademicStructure(schoolId, extensionKey),
      listCalendar: (schoolId, extensionKey) => this.coreReads.listAcademicCalendar(schoolId, extensionKey),
      listSubjects: (schoolId, extensionKey) => this.coreReads.listAcademicSubjects(schoolId, extensionKey),
      listClassSubjects: (schoolId, extensionKey) => this.coreReads.listFormClassSubjects(schoolId, extensionKey),
      listCombinations: (schoolId, extensionKey) => this.coreReads.listCombinations(schoolId, extensionKey),
      listUpcomingEvents: (schoolId, extensionKey) => this.coreReads.listUpcomingEvents(schoolId, extensionKey),
      listReleasedResults: (schoolId, extensionKey) => this.coreReads.listReleasedResults(schoolId, extensionKey),
      attendance: () => this.attendance,
      finance: () => this.finance,
      timetable: () => this.timetable,
      lessonPlans: () => this.lessonPlans,
      discipline: () => this.discipline,
      clubs: () => this.clubs,
      leadership: () => this.leadership,
      reports: () => this.reports,
      channels: () => ({
        receipts: (channel) => this.channels.receipts(activeSchoolId ?? 0, channel),
        remind: () => this.channels.remind(activeSchoolId ?? 0),
        notifyAbsence: (studentId, date) => this.channels.notifyAbsence(activeSchoolId ?? 0, studentId, date),
      }),
      send: (input) => this.notifications.sendFromExtension(input),
    }, requestId);
    this.settings = new SettingsService(this.db);
    this.audit = new AuditService(this.db);
    this.personData = new PersonDataService(this.db, activeSchoolId, ownerUserId, this.audit);
    this.retention = new RetentionService(this.db, activeSchoolId, ownerUserId, this.audit);
    this.access = new AccessService(this.db, ownerUserId);
    this.recordScope = new RecordScopeService(this.db, ownerUserId);
    this.attendance = new AttendanceRecordService(this.db, activeSchoolId, ownerUserId, {
      scope: () => this.recordScope.forSchool(activeSchoolId ?? 0),
      canWrite: () => activeSchoolId == null
        ? Promise.resolve(false)
        : this.access.can(activeSchoolId, 'students.record.write'),
      setting: async (key) => {
        if (activeSchoolId == null) return null;
        const fields = await this.settings.list(activeSchoolId);
        return fields.find((field) => field.extensionKey === 'attendance' && field.key === key)?.value ?? null;
      },
      saveSetting: (key, value) => this.settings.set(activeSchoolId ?? 0, 'attendance', key, value),
      notify: (input) => this.notifications.notifyUser({
        schoolId: activeSchoolId ?? 0,
        userId: input.userId,
        title: input.title,
        body: input.body,
        extensionKey: 'attendance',
      }),
      publishAbsent: (input) => this.events.publish(activeSchoolId ?? 0, 'attendance.record.marked_absent', input),
    });
    this.finance = new FinanceRecordService(this.db, activeSchoolId, ownerUserId, {
      scope: () => this.recordScope.forSchool(activeSchoolId ?? 0),
      canWrite: () => activeSchoolId == null
        ? Promise.resolve(false)
        : this.access.can(activeSchoolId, 'students.record.write'),
      setting: async (key) => {
        if (activeSchoolId == null) return null;
        const fields = await this.settings.list(activeSchoolId);
        return fields.find((field) => field.extensionKey === 'finance' && field.key === key)?.value ?? null;
      },
      saveSetting: (key, value) => this.settings.set(activeSchoolId ?? 0, 'finance', key, value),
      audit: (action, target, detail) => this.audit.append({
        action,
        schoolId: activeSchoolId,
        userId: ownerUserId,
        extensionKey: 'finance',
        target,
        detail,
      }),
      notify: (input) => this.notifications.notifyUser({
        schoolId: activeSchoolId ?? 0,
        userId: input.userId,
        title: input.title,
        body: input.body,
        extensionKey: 'finance',
      }),
      publishPaid: (input) => this.events.publish(activeSchoolId ?? 0, 'finance.payment.confirmed', input),
    });
    this.enrolments.whenEnrolled = async (input) => {
      if (activeSchoolId != null) {
        await this.events.publish(activeSchoolId, 'students.student.enrolled', input);
      }
      await this.finance.onEnrolled(input);
    };
    this.timetable = new TimetableService(this.db, activeSchoolId, ownerUserId, {
      scope: () => this.recordScope.forSchool(activeSchoolId ?? 0),
      canWrite: () => activeSchoolId == null
        ? Promise.resolve(false)
        : this.access.can(activeSchoolId, 'students.record.write'),
    });
    this.lessonPlans = new LessonPlanService(this.db, activeSchoolId, ownerUserId, {
      scope: () => this.recordScope.forSchool(activeSchoolId ?? 0),
      canReview: () => activeSchoolId == null
        ? Promise.resolve(false)
        : this.access.can(activeSchoolId, 'students.record.write'),
    });
    this.discipline = new DisciplineService(this.db, activeSchoolId, ownerUserId, {
      scope: () => this.recordScope.forSchool(activeSchoolId ?? 0),
      canManage: () => activeSchoolId == null
        ? Promise.resolve(false)
        : this.access.can(activeSchoolId, 'students.record.write'),
      audit: (action, target) => this.audit.append({
        action,
        schoolId: activeSchoolId,
        userId: ownerUserId,
        extensionKey: 'discipline',
        target,
      }),
    });
    this.clubs = new ClubService(this.db, activeSchoolId, ownerUserId, {
      scope: () => this.recordScope.forSchool(activeSchoolId ?? 0),
      canManage: () => activeSchoolId == null
        ? Promise.resolve(false)
        : this.access.can(activeSchoolId, 'students.record.write'),
    });
    this.leadership = new LeadershipService(this.db, activeSchoolId, ownerUserId, {
      scope: () => this.recordScope.forSchool(activeSchoolId ?? 0),
      canManage: () => activeSchoolId == null
        ? Promise.resolve(false)
        : this.access.can(activeSchoolId, 'students.record.write'),
    });
    this.channels = new ChannelService(this.db, {
      canManage: () => activeSchoolId == null
        ? Promise.resolve(false)
        : this.access.can(activeSchoolId, 'students.record.write'),
    });
    this.reports = new ReportsService(this.db, activeSchoolId, ownerUserId, {
      scope: () => this.recordScope.forSchool(activeSchoolId ?? 0),
      canManage: () => activeSchoolId == null
        ? Promise.resolve(false)
        : this.access.can(activeSchoolId, 'students.record.write'),
      widgets: () => this.reportWidgets(activeSchoolId),
      createStaff: (input) => this.staff.create(input),
    });
    this.publishers = new PublisherService(this.db, {
      audit: (action, target) => this.audit.append({
        action,
        schoolId: activeSchoolId,
        userId: ownerUserId,
        target,
      }),
    });
    this.sessions = new SessionService(this.db, jwtSecret);
    this.invitations = new InvitationService(this.db, ownerUserId);
    this.passwordResets = new PasswordResetService(this.db);
  }

  private async reportWidgets(schoolId: number | null) {
    if (schoolId == null) return [];
    for (const key of ['hello', 'notices', 'attendance', 'reports']) {
      try {
        await this.extensions.enable(schoolId, key);
      } catch {
        // A widget that is already on still contributes to the dashboard.
      }
    }
    const slots = await this.extensions.runSchoolSlot(schoolId, 'dashboard.widgets', {});
    return slots.flatMap((slot) => (
      slot.kind === 'document'
        ? [{ extensionKey: slot.extensionKey, body: slot.document.body, catalog: localesFor(slot.extensionKey).en }]
        : []
    ));
  }

  /**
   * Get all available services
   * Useful for debugging or service discovery
   */
  getServices() {
    return {
      users: this.users,
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
      schoolThemes: this.schoolThemes,
    };
  }

  async reportHealth(): Promise<HealthReport> {
    return healthReport({
      database: await this.databaseCheck(),
      extensionHost: await this.extensionHostCheck(),
    });
  }

  private async databaseCheck(): Promise<'ok' | 'down'> {
    try {
      await this.db.run(sql`select 1`);
      return 'ok';
    } catch {
      return 'down';
    }
  }

  private async extensionHostCheck(): Promise<'ok' | 'down'> {
    try {
      await bundledExtensionHost.getEntrypoint({ key: 'hello', version: 'bundled' }, []);
      return 'ok';
    } catch {
      return 'down';
    }
  }
}