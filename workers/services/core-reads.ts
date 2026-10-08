import { and, asc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { describeAcademicCalendar } from '../kernel/academic-calendar';
import { describeStudentRecords } from '../kernel/student-records';
import { describeEnrolments } from '../kernel/student-enrolments';
import { describeGuardianLinks } from '../kernel/guardians';
import { describeYearSubjects } from '../kernel/student-year-subjects';
import { describeAcademicStructure } from '../kernel/academic-structure';
import { describeLinkedSubjects } from '../kernel/academic-subjects';
import { describeFormClassSubjects } from '../kernel/form-class-subjects';
import { describeCombinations } from '../kernel/subject-combinations';
import {
  readAcademicCalendar,
  readAcademicStructure,
  readAcademicSubjects,
  readCombinations,
  readFormClassSubjects,
  readClassNames,
  readGuardianContacts,
  readGuardianNames,
  readStaffAssignments,
  readStaffNames,
  readStudentIdentities,
  requireCapability,
} from '../kernel/core-reads';
import { academicForms, academicLevels, academicStreams, formClasses } from '../database/academic-levels';
import { academicYears, terms } from '../database/academic-years';
import { formClassSubjects } from '../database/form-class-subjects';
import { combinationSubjects, subjectCombinations } from '../database/subject-combinations';
import { subject } from '../database/subjects';
import { extensionSettings } from '../database/extension-registry';
import { students } from '../database/students';
import { studentEnrolments } from '../database/student-enrolments';
import { studentYearSubjects } from '../database/student-year-subjects';
import { guardianStudents, guardians } from '../database/guardians';
import { teacherFormClasses } from '../database/teacher-form-classes';
import { teacherSubjects } from '../database/teacher-subjects';
import { teachers } from '../database/teachers';
import { findBundledManifest } from '../extensions/catalog';

const grantedCapabilitiesKey = 'granted_capabilities';

export default class CoreReadService {
  constructor(private db: AppDatabase) {}

  listStudents(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, (granted) => readStudentIdentities({
      granted,
      schoolId,
      load: (id) => this.db
        .select({
          id: students.id,
          firstName: students.firstName,
          lastName: students.lastName,
          admissionNumber: students.admissionNumber,
          formClassId: students.formClassId,
        })
        .from(students)
        .where(and(eq(students.schoolId, id), eq(students.status, 'Active'))),
      present: (row) => row,
    }));
  }

  listStudentRecords(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, async (granted) => {
      requireCapability(granted, 'core.students:read');
      const rows = await this.db
        .select({
          firstName: students.firstName,
          middleName: students.middleName,
          lastName: students.lastName,
          gender: students.gender,
          dob: students.dob,
          enrollmentDate: students.enrollmentDate,
        })
        .from(students)
        .where(eq(students.schoolId, schoolId))
        .orderBy(asc(students.lastName), asc(students.firstName));
      return describeStudentRecords(rows.map((row) => ({
        firstName: row.firstName,
        middleName: row.middleName,
        lastName: row.lastName,
        gender: row.gender,
        dateOfBirth: row.dob,
        admissionDate: row.enrollmentDate,
      })));
    });
  }

  listStudentEnrolments(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, async (granted) => {
      requireCapability(granted, 'core.students:read');
      const rows = await this.db
        .select({
          firstName: students.firstName,
          middleName: students.middleName,
          lastName: students.lastName,
          yearName: academicYears.name,
          className: formClasses.name,
          status: studentEnrolments.status,
          moveReason: studentEnrolments.moveReason,
        })
        .from(studentEnrolments)
        .innerJoin(students, eq(students.id, studentEnrolments.studentId))
        .innerJoin(academicYears, eq(academicYears.id, studentEnrolments.academicYearId))
        .leftJoin(formClasses, eq(formClasses.id, studentEnrolments.formClassId))
        .where(eq(studentEnrolments.schoolId, schoolId))
        .orderBy(asc(academicYears.name), asc(students.lastName), asc(students.firstName));
      return describeEnrolments(rows.map((row) => ({
        studentName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
        yearName: row.yearName,
        className: row.className,
        status: row.status,
        moveReason: row.moveReason,
      })));
    });
  }

  listGuardianLinks(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, async (granted) => {
      if (!granted.includes('core.students:read')) {
        throw new Error('This extension cannot read student records.');
      }
      const rows = await this.db
        .select({
          firstName: students.firstName,
          middleName: students.middleName,
          lastName: students.lastName,
          guardianName: guardians.fullName,
          relationship: guardianStudents.relationship,
          isPrimary: guardianStudents.isPrimary,
        })
        .from(guardianStudents)
        .innerJoin(students, eq(students.id, guardianStudents.studentId))
        .innerJoin(guardians, eq(guardians.id, guardianStudents.guardianId))
        .where(eq(guardianStudents.schoolId, schoolId))
        .orderBy(asc(students.lastName), asc(students.firstName), asc(guardians.fullName));
      return describeGuardianLinks(rows.map((row) => ({
        studentName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
        guardianName: row.guardianName,
        relationship: row.relationship,
        primary: row.isPrimary,
      })));
    });
  }

  listStudentYearSubjects(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, async (granted) => {
      if (!granted.includes('core.students:read')) {
        throw new Error('This extension cannot read student records.');
      }
      const rows = await this.db
        .select({
          firstName: students.firstName,
          middleName: students.middleName,
          lastName: students.lastName,
          yearName: academicYears.name,
          subjectName: subject.subjectName,
          combinationName: subjectCombinations.name,
        })
        .from(studentYearSubjects)
        .innerJoin(students, eq(students.id, studentYearSubjects.studentId))
        .innerJoin(academicYears, eq(academicYears.id, studentYearSubjects.academicYearId))
        .innerJoin(subject, eq(subject.id, studentYearSubjects.subjectId))
        .leftJoin(subjectCombinations, eq(subjectCombinations.id, studentYearSubjects.combinationId))
        .where(eq(studentYearSubjects.schoolId, schoolId))
        .orderBy(asc(academicYears.name), asc(students.lastName), asc(subject.subjectName));
      return describeYearSubjects(rows.map((row) => ({
        studentName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
        yearName: row.yearName,
        subjectName: row.subjectName,
        combinationName: row.combinationName,
      })));
    });
  }

  listReleasedResults(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, async (granted) => {
      requireCapability(granted, 'core.students:read');
      const { default: AssessmentRecordService } = await import('./assessment-records');
      const assessment = new AssessmentRecordService(this.db, schoolId);
      return assessment.releasedLines();
    });
  }

  listUpcomingEvents(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, async (granted) => {
      requireCapability(granted, 'core.academics:read');
      const { default: CalendarEventService } = await import('./calendar-events');
      const calendar = new CalendarEventService(this.db, schoolId);
      return calendar.upcoming(new Date().toISOString().slice(0, 10));
    });
  }

  listGuardianNames(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, (granted) => readGuardianNames({
      granted,
      schoolId,
      load: (id) => this.db
        .select({ id: students.id, guardianName: students.guardianName })
        .from(students)
        .where(and(eq(students.schoolId, id), eq(students.status, 'Active'))),
      present: (row) => row,
    }));
  }

  listGuardianContacts(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, (granted) => readGuardianContacts({
      granted,
      schoolId,
      load: (id) => this.db
        .select({
          id: students.id,
          guardianName: students.guardianName,
          guardianPhone: students.guardianPhone,
          address: students.address,
        })
        .from(students)
        .where(and(eq(students.schoolId, id), eq(students.status, 'Active'))),
      present: (row) => row,
    }));
  }

  listStaffNames(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, (granted) => readStaffNames({
      granted,
      schoolId,
      load: (id) => this.db
        .select({ id: teachers.id, firstName: teachers.firstName, lastName: teachers.lastName })
        .from(teachers)
        .where(and(eq(teachers.schoolId, id), eq(teachers.status, 'Active'))),
      present: (row) => row,
    }));
  }

  listStaffAssignments(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, (granted) => readStaffAssignments({
      granted,
      schoolId,
      load: (id) => this.loadStaffAssignments(id),
      present: (row) => row,
    }));
  }

  listClasses(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, (granted) => readClassNames({
      granted,
      schoolId,
      load: (id) => this.db
        .select({ id: formClasses.id, name: formClasses.name })
        .from(formClasses)
        .where(eq(formClasses.schoolId, id)),
      present: (row) => row,
    }));
  }

  private async loadStaffAssignments(schoolId: number) {
    const classRows = await this.db
      .select({ teacherId: teacherFormClasses.teacherId, classId: teacherFormClasses.formClassId })
      .from(teacherFormClasses)
      .where(eq(teacherFormClasses.schoolId, schoolId));
    const subjectRows = await this.db
      .select({ teacherId: teacherSubjects.teacherId, subjectId: teacherSubjects.subjectId })
      .from(teacherSubjects)
      .where(eq(teacherSubjects.schoolId, schoolId));
    return [
      ...classRows.map((row) => ({ teacherId: row.teacherId, classId: row.classId, subjectId: null })),
      ...subjectRows.map((row) => ({ teacherId: row.teacherId, classId: null, subjectId: row.subjectId })),
    ];
  }

  listClassNames(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, (granted) => readClassNames({
      granted,
      schoolId,
      load: (id) => this.db
        .select({ id: formClasses.id, name: formClasses.name })
        .from(formClasses)
        .where(eq(formClasses.schoolId, id)),
      present: (row) => row,
    }));
  }

  listAcademicStructure(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, async (granted) => {
      const loaded = await readAcademicStructure({
        granted,
        schoolId,
        load: async (id) => ({
          levels: await this.db
            .select({ id: academicLevels.id, name: academicLevels.name })
            .from(academicLevels)
            .where(eq(academicLevels.schoolId, id)),
          streams: await this.db
            .select({ id: academicStreams.id, levelId: academicStreams.levelId, name: academicStreams.name })
            .from(academicStreams)
            .where(eq(academicStreams.schoolId, id)),
          forms: await this.db
            .select({ id: academicForms.id, streamId: academicForms.streamId, name: academicForms.name })
            .from(academicForms)
            .where(eq(academicForms.schoolId, id)),
          classes: await this.db
            .select({ id: formClasses.id, formId: formClasses.formId, name: formClasses.name })
            .from(formClasses)
            .where(eq(formClasses.schoolId, id)),
        }),
      });
      return describeAcademicStructure(loaded);
    });
  }

  listAcademicCalendar(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, async (granted) => {
      const loaded = await readAcademicCalendar({
        granted,
        schoolId,
        load: async (id) => ({
          years: await this.db
            .select({ id: academicYears.id, name: academicYears.name, status: academicYears.status })
            .from(academicYears)
            .where(eq(academicYears.schoolId, id)),
          terms: await this.db
            .select({
              academicYearId: terms.academicYearId,
              name: terms.name,
              isCurrent: terms.isCurrent,
            })
            .from(terms)
            .where(eq(terms.schoolId, id)),
        }),
      });
      return describeAcademicCalendar(loaded);
    });
  }

  listAcademicSubjects(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, async (granted) => {
      const loaded = await readAcademicSubjects({
        granted,
        schoolId,
        load: async (id) => ({
          subjects: await this.db
            .select({
              name: subject.subjectName,
              code: subject.code,
              levelId: subject.levelId,
              streamId: subject.streamId,
            })
            .from(subject)
            .where(eq(subject.schoolId, id)),
          levels: await this.db
            .select({ id: academicLevels.id, name: academicLevels.name })
            .from(academicLevels)
            .where(eq(academicLevels.schoolId, id)),
          streams: await this.db
            .select({ id: academicStreams.id, levelId: academicStreams.levelId, name: academicStreams.name })
            .from(academicStreams)
            .where(eq(academicStreams.schoolId, id)),
        }),
      });
      return describeLinkedSubjects(loaded);
    });
  }

  listFormClassSubjects(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, async (granted) => {
      const loaded = await readFormClassSubjects({
        granted,
        schoolId,
        load: async (id) => ({
          levels: await this.db
            .select({ id: academicLevels.id, name: academicLevels.name })
            .from(academicLevels)
            .where(eq(academicLevels.schoolId, id)),
          streams: await this.db
            .select({ id: academicStreams.id, name: academicStreams.name })
            .from(academicStreams)
            .where(eq(academicStreams.schoolId, id)),
          forms: await this.db
            .select({ id: academicForms.id, name: academicForms.name })
            .from(academicForms)
            .where(eq(academicForms.schoolId, id)),
          classes: await this.db
            .select({
              id: formClasses.id,
              name: formClasses.name,
              levelId: formClasses.levelId,
              streamId: formClasses.streamId,
              formId: formClasses.formId,
            })
            .from(formClasses)
            .where(eq(formClasses.schoolId, id)),
          subjects: await this.db
            .select({ id: subject.id, name: subject.subjectName, code: subject.code })
            .from(subject)
            .where(eq(subject.schoolId, id)),
          assignments: await this.db
            .select({
              formClassId: formClassSubjects.formClassId,
              subjectId: formClassSubjects.subjectId,
            })
            .from(formClassSubjects)
            .where(eq(formClassSubjects.schoolId, id)),
        }),
      });
      return describeFormClassSubjects(loaded);
    });
  }

  listCombinations(schoolId: number, extensionKey: string) {
    return this.withGrant(schoolId, extensionKey, async (granted) => {
      const loaded = await readCombinations({
        granted,
        schoolId,
        load: async (id) => {
          const combinations = await this.db
            .select({
              id: subjectCombinations.id,
              name: subjectCombinations.name,
              status: subjectCombinations.status,
            })
            .from(subjectCombinations)
            .where(eq(subjectCombinations.schoolId, id));
          const links = await this.db
            .select({
              combinationId: combinationSubjects.combinationId,
              subjectId: combinationSubjects.subjectId,
            })
            .from(combinationSubjects)
            .where(eq(combinationSubjects.schoolId, id));
          const subjects = await this.db
            .select({ id: subject.id, name: subject.subjectName, code: subject.code })
            .from(subject)
            .where(eq(subject.schoolId, id));
          return { combinations, links, subjects };
        },
      });
      return describeCombinations(loaded);
    });
  }

  private async withGrant<T>(
    schoolId: number,
    extensionKey: string,
    read: (granted: string[]) => Promise<T>,
  ): Promise<T> {
    return read(await this.grantedCapabilities(schoolId, extensionKey));
  }

  private async grantedCapabilities(schoolId: number, extensionKey: string): Promise<string[]> {
    const manifest = findBundledManifest(extensionKey);
    if (manifest?.required) {
      return manifest.capabilities;
    }
    const stored = await this.db
      .select({ settingValue: extensionSettings.settingValue })
      .from(extensionSettings)
      .where(and(
        eq(extensionSettings.schoolId, schoolId),
        eq(extensionSettings.extensionKey, extensionKey),
        eq(extensionSettings.settingKey, grantedCapabilitiesKey),
      ))
      .get();
    if (stored) {
      return parseGranted(stored.settingValue);
    }
    return [];
  }
}

function parseGranted(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
