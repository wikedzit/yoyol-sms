import { and, asc, eq } from 'drizzle-orm';
import { academicYears } from '../database/academic-years';
import { formClasses } from '../database/academic-levels';
import type { AppDatabase } from '../database/app-database';
import { extensionSettings } from '../database/extension-registry';
import { financeFeeItems, financeStructures } from '../database/finance';
import { reportPreviews } from '../database/reports';
import { roles } from '../database/roles';
import { schoolMemberships } from '../database/school-memberships';
import { students } from '../database/students';
import { subject } from '../database/subjects';
import { teachers } from '../database/teachers';
import { teachingAssignments } from '../database/teaching-assignments';
import { minorUnits } from '../kernel/finance';
import {
  dashboardForRole,
  linesFromWidget,
  majorAmount,
  previewImport,
  roleDashboardLine,
  toCsv,
  type ImportKind,
  type ReportRole,
  type ReportsPage,
  type ReportWidget,
} from '../kernel/reports';
import { requireSchoolId } from '../utils/require-owner-user';
import type { StaffInput } from './staff-records';
import type { RecordScope } from './visible-records';

type WidgetSource = {
  extensionKey: string;
  body: unknown;
  catalog: Record<string, string>;
};

type ReportsDeps = {
  scope: () => Promise<RecordScope>;
  canManage: () => Promise<boolean>;
  widgets: () => Promise<WidgetSource[]>;
  createStaff: (input: StaffInput) => Promise<{ error: string } | { id: number }>;
};

type Viewer = {
  role: ReportRole;
  studentIds: number[];
  teacherIds: number[];
};

const widgetNames: Record<string, string> = {
  notices: 'Notices',
  attendance: 'Attendance',
  reports: 'Reports',
};

export default class ReportsService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
    private currentUserId: number | null = null,
    private deps: ReportsDeps,
  ) {}

  async roleLine(): Promise<string> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const viewer = await this.viewer();
    const studentCount = viewer.role === 'admin' ? (await this.schoolStudents(schoolId)).length : 0;
    const staffCount = viewer.role === 'admin' ? (await this.schoolStaff(schoolId)).length : 0;
    return roleDashboardLine({
      role: viewer.role,
      studentCount,
      staffCount,
      assignments: viewer.role === 'teacher' ? await this.assignmentLines(schoolId, viewer.teacherIds) : [],
      names: viewer.role === 'student' || viewer.role === 'parent' ? await this.studentNames(viewer.studentIds) : [],
    });
  }

  async open(): Promise<ReportsPage> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const viewer = await this.viewer();
    const sources = await this.deps.widgets();
    const widgets = dashboardForRole(viewer.role, sources.map((source) => ({
      name: widgetNames[source.extensionKey] ?? source.extensionKey,
      lines: linesFromWidget(source.body, source.catalog),
    })));
    const preview = await this.storedPreview(schoolId);
    return {
      canManage: viewer.role === 'admin',
      widgets,
      previewLines: preview ? preview.summary.split('\n').filter((line) => line.length > 0) : [],
      previewReady: preview?.ready ?? false,
    };
  }

  async save(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    if (!(await this.deps.canManage())) return { error: 'You do not have permission to import records.' };
    const action = fields._action;
    if (action === 'preview') return this.storePreview(fields.kind ?? '', fields.csv ?? '');
    if (action === 'save') return this.commitPreview();
    return { error: 'That reports action is not available.' };
  }

  async exportCsv(kind: string): Promise<string> {
    if (!(await this.deps.canManage())) return '';
    const schoolId = requireSchoolId(this.activeSchoolId);
    if (kind === 'students') return this.studentCsv(schoolId);
    if (kind === 'staff') return this.staffCsv(schoolId);
    if (kind === 'fees') return this.feeCsv(schoolId);
    return '';
  }

  private async storePreview(kind: string, text: string): Promise<{ error: string } | { ok: true }> {
    if (!isImportKind(kind)) return { error: 'Choose students, staff, or fee structures.' };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const preview = previewImport({ kind, text, ...(await this.known(schoolId)) });
    await this.replacePreview(schoolId, kind, text, preview.lines.join('\n'), preview.ready);
    return { ok: true };
  }

  private async commitPreview(): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const stored = await this.storedPreview(schoolId);
    if (!stored || !isImportKind(stored.kind)) return { error: 'Preview the spreadsheet before saving.' };
    const preview = previewImport({ kind: stored.kind, text: stored.csvText, ...(await this.known(schoolId)) });
    if (!preview.ready) {
      await this.replacePreview(schoolId, stored.kind, stored.csvText, preview.lines.join('\n'), false);
      return { error: 'Fix the preview before saving.' };
    }
    const saved = await this.insertRows(schoolId, stored.kind, preview.rows);
    if ('error' in saved) return saved;
    await this.db.delete(reportPreviews).where(eq(reportPreviews.id, stored.id));
    return { ok: true };
  }

  private async insertRows(
    schoolId: number,
    kind: ImportKind,
    rows: Record<string, string>[],
  ): Promise<{ error: string } | { ok: true }> {
    for (const row of rows) {
      const saved = kind === 'students'
        ? await this.insertStudent(schoolId, row)
        : kind === 'staff'
          ? await this.insertStaff(row)
          : await this.insertFee(schoolId, row);
      if ('error' in saved) return saved;
    }
    return { ok: true };
  }

  private async insertStudent(schoolId: number, row: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const now = Date.now();
    await this.db.insert(students).values({
      firstName: row.firstName,
      lastName: row.lastName,
      admissionNumber: row.admissionNumber,
      gender: row.gender || 'Female',
      status: 'Active',
      schoolId,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true };
  }

  private async insertStaff(row: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const saved = await this.deps.createStaff({
      firstName: row.firstName,
      middleName: '',
      lastName: row.lastName,
      gender: 'Female',
      phone: '',
      email: row.email,
      address: '',
      staffType: row.staffType,
      qualification: '',
    });
    return 'error' in saved ? saved : { ok: true };
  }

  private async insertFee(schoolId: number, row: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const year = await this.activeYear(schoolId);
    if (!year) return { error: 'Choose an active academic year before setting a fee.' };
    const formClass = await this.db.select({ id: formClasses.id }).from(formClasses)
      .where(and(eq(formClasses.schoolId, schoolId), eq(formClasses.name, row.className))).get();
    const item = await this.db.select({ id: financeFeeItems.id }).from(financeFeeItems)
      .where(and(eq(financeFeeItems.schoolId, schoolId), eq(financeFeeItems.code, row.feeCode))).get();
    if (!formClass || !item) return { error: 'Choose a class and a fee item that exist.' };
    const currency = await this.currency(schoolId);
    const amount = minorUnits(row.amount, currency);
    if ('error' in amount) return amount;
    const now = Date.now();
    await this.db.insert(financeStructures).values({
      schoolId,
      feeItemId: item.id,
      formClassId: formClass.id,
      academicYearId: year.id,
      amountMinor: amount.amountMinor,
      currency,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
    });
    return { ok: true };
  }

  private async studentCsv(schoolId: number): Promise<string> {
    const rows = await this.schoolStudents(schoolId);
    return toCsv(
      ['firstName', 'lastName', 'admissionNumber', 'gender'],
      rows.map((row) => ({
        firstName: row.firstName,
        lastName: row.lastName,
        admissionNumber: row.admissionNumber ?? '',
        gender: row.gender,
      })),
    );
  }

  private async staffCsv(schoolId: number): Promise<string> {
    const rows = await this.schoolStaff(schoolId);
    return toCsv(
      ['firstName', 'lastName', 'email', 'staffType'],
      rows.map((row) => ({
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        staffType: row.staffType,
      })),
    );
  }

  private async feeCsv(schoolId: number): Promise<string> {
    const year = await this.activeYear(schoolId);
    if (!year) return toCsv(['className', 'feeCode', 'amount'], []);
    const currency = await this.currency(schoolId);
    const rows = await this.db.select({
      className: formClasses.name,
      feeCode: financeFeeItems.code,
      amountMinor: financeStructures.amountMinor,
    }).from(financeStructures)
      .innerJoin(formClasses, eq(formClasses.id, financeStructures.formClassId))
      .innerJoin(financeFeeItems, eq(financeFeeItems.id, financeStructures.feeItemId))
      .where(and(eq(financeStructures.schoolId, schoolId), eq(financeStructures.academicYearId, year.id)))
      .orderBy(asc(formClasses.name));
    return toCsv(['className', 'feeCode', 'amount'], rows.map((row) => ({
      className: row.className,
      feeCode: row.feeCode ?? '',
      amount: majorAmount(row.amountMinor, currency),
    })));
  }

  private async known(schoolId: number) {
    const people = await this.schoolStudents(schoolId);
    const staff = await this.schoolStaff(schoolId);
    const classes = await this.db.select({ name: formClasses.name }).from(formClasses)
      .where(eq(formClasses.schoolId, schoolId));
    const items = await this.db.select({ code: financeFeeItems.code }).from(financeFeeItems)
      .where(eq(financeFeeItems.schoolId, schoolId));
    const year = await this.activeYear(schoolId);
    const structures = year ? await this.db.select({
      className: formClasses.name,
      feeCode: financeFeeItems.code,
    }).from(financeStructures)
      .innerJoin(formClasses, eq(formClasses.id, financeStructures.formClassId))
      .innerJoin(financeFeeItems, eq(financeFeeItems.id, financeStructures.feeItemId))
      .where(and(eq(financeStructures.schoolId, schoolId), eq(financeStructures.academicYearId, year.id))) : [];
    return {
      admissionNumbers: people.map((row) => row.admissionNumber ?? '').filter((value) => value.length > 0),
      staffEmails: staff.map((row) => row.email),
      classes: classes.map((row) => row.name),
      feeCodes: items.map((row) => row.code ?? '').filter((value) => value.length > 0),
      feeKeys: structures.map((row) => `${row.className}|${row.feeCode ?? ''}`),
    };
  }

  private async schoolStudents(schoolId: number) {
    return this.db.select({
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      gender: students.gender,
    }).from(students).where(eq(students.schoolId, schoolId)).orderBy(asc(students.lastName));
  }

  private async schoolStaff(schoolId: number) {
    return this.db.select({
      firstName: teachers.firstName,
      lastName: teachers.lastName,
      email: teachers.email,
      staffType: teachers.staffType,
    }).from(teachers).where(eq(teachers.schoolId, schoolId)).orderBy(asc(teachers.lastName));
  }

  private async assignmentLines(schoolId: number, teacherIds: number[]): Promise<string[]> {
    if (teacherIds.length === 0) return [];
    const year = await this.activeYear(schoolId);
    if (!year) return [];
    const rows = await this.db.select({
      subjectName: subject.subjectName,
      className: formClasses.name,
      teacherId: teachingAssignments.teacherId,
    }).from(teachingAssignments)
      .innerJoin(subject, eq(subject.id, teachingAssignments.subjectId))
      .innerJoin(formClasses, eq(formClasses.id, teachingAssignments.formClassId))
      .where(and(eq(teachingAssignments.schoolId, schoolId), eq(teachingAssignments.academicYearId, year.id)));
    return rows
      .filter((row) => teacherIds.includes(row.teacherId))
      .map((row) => `${row.subjectName}, ${row.className}`);
  }

  private async studentNames(ids: number[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.select({
      id: students.id,
      firstName: students.firstName,
      middleName: students.middleName,
      lastName: students.lastName,
    }).from(students);
    return rows
      .filter((row) => ids.includes(row.id))
      .map((row) => [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '));
  }

  private async viewer(): Promise<Viewer> {
    if (await this.deps.canManage()) return { role: 'admin', studentIds: [], teacherIds: [] };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const scope = await this.deps.scope();
    const roleKey = await this.roleKey(schoolId);
    if (scope.kind === 'limited' && roleKey === 'teacher') {
      return { role: 'teacher', studentIds: [], teacherIds: scope.teacherIds };
    }
    if (scope.kind === 'limited' && (roleKey === 'student' || roleKey === 'parent')) {
      return { role: roleKey, studentIds: scope.studentIds, teacherIds: [] };
    }
    return { role: 'other', studentIds: [], teacherIds: [] };
  }

  private async roleKey(schoolId: number): Promise<string | null> {
    if (this.currentUserId == null) return null;
    const row = await this.db.select({ key: roles.key }).from(schoolMemberships)
      .innerJoin(roles, eq(roles.id, schoolMemberships.roleId))
      .where(and(
        eq(schoolMemberships.schoolId, schoolId),
        eq(schoolMemberships.userId, this.currentUserId),
        eq(schoolMemberships.status, 'active'),
      )).get();
    return row?.key ?? null;
  }

  private async activeYear(schoolId: number) {
    return this.db.select({ id: academicYears.id }).from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active'))).get();
  }

  private async currency(schoolId: number): Promise<string> {
    const stored = await this.db.select({ value: extensionSettings.settingValue }).from(extensionSettings)
      .where(and(
        eq(extensionSettings.schoolId, schoolId),
        eq(extensionSettings.extensionKey, 'finance'),
        eq(extensionSettings.settingKey, 'currency'),
      )).get();
    return stored?.value === 'KES' || stored?.value === 'UGX' || stored?.value === 'TZS' ? stored.value : 'TZS';
  }

  private async storedPreview(schoolId: number) {
    if (this.currentUserId == null) return null;
    return this.db.select().from(reportPreviews).where(and(
      eq(reportPreviews.schoolId, schoolId),
      eq(reportPreviews.createdBy, this.currentUserId),
    )).get();
  }

  private async replacePreview(schoolId: number, kind: string, text: string, summary: string, ready: boolean) {
    const now = Date.now();
    const existing = await this.storedPreview(schoolId);
    if (existing) {
      await this.db.update(reportPreviews).set({
        kind,
        csvText: text,
        summary,
        ready,
        updatedAt: now,
      }).where(eq(reportPreviews.id, existing.id));
      return;
    }
    await this.db.insert(reportPreviews).values({
      schoolId,
      kind,
      csvText: text,
      summary,
      ready,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
    });
  }
}

function isImportKind(value: string): value is ImportKind {
  return value === 'students' || value === 'staff' || value === 'fees';
}
