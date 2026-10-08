import { and, asc, eq, inArray } from 'drizzle-orm';
import { academicYears } from '../database/academic-years';
import type { AppDatabase } from '../database/app-database';
import { disciplineIncidents, disciplineSeverities, disciplineTypes } from '../database/discipline';
import { roles } from '../database/roles';
import { schoolMemberships } from '../database/school-memberships';
import { studentEnrolments } from '../database/student-enrolments';
import { students } from '../database/students';
import {
  canSeeIncident,
  describeIncident,
  refusalToClose,
  refusalToSaveIncident,
  refusalToSaveKind,
  type DisciplineIncident,
  type DisciplinePage,
} from '../kernel/discipline';
import { requireSchoolId } from '../utils/require-owner-user';
import type { RecordScope } from './visible-records';

type DisciplineDeps = {
  scope: () => Promise<RecordScope>;
  canManage: () => Promise<boolean>;
  audit: (action: string, target: string) => Promise<void>;
};

type Viewer = {
  role: 'admin' | 'teacher' | 'guardian' | 'other';
  teacherId: number | null;
  studentIds: number[];
};

export default class DisciplineService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
    private currentUserId: number | null = null,
    private deps: DisciplineDeps,
  ) {}

  async open(): Promise<DisciplinePage> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const viewer = await this.viewer(schoolId);
    const incidents = (await this.incidentRows(schoolId))
      .filter((incident) => this.visible(incident, viewer))
      .map((incident) => ({
        ...incident,
        canUpdate: !incident.closed && (
          viewer.role === 'admin'
          || (viewer.role === 'teacher' && incident.teacherId === viewer.teacherId)
        ),
      }));
    for (const incident of incidents) {
      await this.deps.audit('discipline.incident.view', `incident:${incident.id}`);
    }
    return {
      canManage: viewer.role === 'admin',
      canRecord: viewer.role === 'admin' || viewer.role === 'teacher',
      types: await this.kindRows(schoolId, 'type'),
      severities: await this.kindRows(schoolId, 'severity'),
      incidents,
      students: await this.studentChoices(schoolId),
    };
  }

  async save(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const action = fields._action;
    if (action === 'type' || action === 'severity' || action === 'deactivate-type' || action === 'deactivate-severity') {
      if (!(await this.deps.canManage())) return { error: 'You do not have permission to change incident lists.' };
      if (action === 'deactivate-type') return this.deactivate(Number(fields.typeId), 'type');
      if (action === 'deactivate-severity') return this.deactivate(Number(fields.severityId), 'severity');
      return this.saveKind(fields.name ?? '', action === 'type' ? 'type' : 'severity', Number(fields.kindId));
    }
    if (action === 'incident') return this.saveIncident(fields);
    if (action === 'close') return this.closeIncident(Number(fields.incidentId));
    return { error: 'That discipline action is not available.' };
  }

  private async saveKind(name: string, kind: 'type' | 'severity', kindId: number): Promise<{ error: string } | { ok: true }> {
    const refused = refusalToSaveKind(name);
    if (refused) return { error: refused };
    const schoolId = requireSchoolId(this.activeSchoolId);
    const table = kind === 'type' ? disciplineTypes : disciplineSeverities;
    const trimmed = name.trim();
    const taken = await this.db
      .select({ id: table.id })
      .from(table)
      .where(and(eq(table.schoolId, schoolId), eq(table.name, trimmed)))
      .get();
    if (taken && taken.id !== kindId) return { error: 'That name is already in use.' };
    const now = Date.now();
    if (kindId > 0) {
      await this.db.update(table).set({ name: trimmed, updatedAt: now }).where(and(
        eq(table.id, kindId),
        eq(table.schoolId, schoolId),
      ));
      return { ok: true };
    }
    await this.db.insert(table).values({
      schoolId,
      name: trimmed,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
    });
    return { ok: true };
  }

  private async deactivate(kindId: number, kind: 'type' | 'severity'): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const table = kind === 'type' ? disciplineTypes : disciplineSeverities;
    await this.db.update(table).set({ active: false, updatedAt: Date.now() }).where(and(
      eq(table.id, kindId),
      eq(table.schoolId, schoolId),
    ));
    return { ok: true };
  }

  private async saveIncident(fields: Record<string, string>): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const viewer = await this.viewer(schoolId);
    const incidentId = Number(fields.incidentId);
    const existing = incidentId > 0 ? await this.oneIncident(schoolId, incidentId) : null;
    if (incidentId > 0 && !existing) return { error: 'That incident was not found.' };
    const typeId = Number(fields.typeId || existing?.typeId);
    const severityId = Number(fields.severityId || existing?.severityId);
    const type = await this.db.select({ active: disciplineTypes.active }).from(disciplineTypes)
      .where(and(eq(disciplineTypes.id, typeId), eq(disciplineTypes.schoolId, schoolId))).get();
    const severity = await this.db.select({ active: disciplineSeverities.active }).from(disciplineSeverities)
      .where(and(eq(disciplineSeverities.id, severityId), eq(disciplineSeverities.schoolId, schoolId))).get();
    const teacherId = existing?.teacherId ?? viewer.teacherId;
    const canUpdate = existing
      ? canSeeIncident({
        role: viewer.role === 'guardian' ? 'other' : viewer.role,
        recordedByTeacher: viewer.role === 'teacher' && teacherId === viewer.teacherId,
        linkedStudent: false,
      })
      : viewer.role === 'admin' || viewer.role === 'teacher';
    const refused = refusalToSaveIncident({
      description: fields.description ?? '',
      actionTaken: fields.actionTaken ?? '',
      incidentDate: fields.incidentDate || existing?.incidentDate || '',
      typeActive: Boolean(type) && (existing != null || type?.active === true),
      severityActive: Boolean(severity) && (existing != null || severity?.active === true),
      closed: existing?.closed === true,
      canUpdate,
    });
    if (refused) return { error: refused };
    const studentId = Number(fields.studentId || existing?.studentId);
    if (!studentId) return { error: 'Choose a student.' };
    const now = Date.now();
    const values = {
      typeId,
      severityId,
      studentId,
      description: fields.description.trim(),
      actionTaken: fields.actionTaken.trim(),
      incidentDate: fields.incidentDate || existing?.incidentDate || '',
      updatedAt: now,
    };
    if (existing) {
      await this.db.update(disciplineIncidents).set(values).where(and(
        eq(disciplineIncidents.id, existing.id),
        eq(disciplineIncidents.schoolId, schoolId),
      ));
      return { ok: true };
    }
    await this.db.insert(disciplineIncidents).values({
      ...values,
      schoolId,
      teacherId: viewer.teacherId,
      closed: false,
      createdAt: now,
      createdBy: this.currentUserId,
    });
    return { ok: true };
  }

  private async closeIncident(incidentId: number): Promise<{ error: string } | { ok: true }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const incident = await this.oneIncident(schoolId, incidentId);
    if (!incident) return { error: 'That incident was not found.' };
    const refused = refusalToClose({ closed: incident.closed, canClose: await this.deps.canManage() });
    if (refused) return { error: refused };
    await this.db.update(disciplineIncidents).set({ closed: true, updatedAt: Date.now() }).where(and(
      eq(disciplineIncidents.id, incident.id),
      eq(disciplineIncidents.schoolId, schoolId),
    ));
    await this.deps.audit('discipline.incident.close', `incident:${incident.id}`);
    return { ok: true };
  }

  private visible(incident: DisciplineIncident, viewer: Viewer): boolean {
    return canSeeIncident({
      role: viewer.role,
      recordedByTeacher: viewer.teacherId != null && incident.teacherId === viewer.teacherId,
      linkedStudent: viewer.studentIds.includes(incident.studentId),
    });
  }

  private async viewer(schoolId: number): Promise<Viewer> {
    const scope = await this.deps.scope();
    if (await this.deps.canManage()) return { role: 'admin', teacherId: null, studentIds: [] };
    const roleKey = await this.roleKey(schoolId);
    if (roleKey === 'teacher' && scope.kind === 'limited' && scope.teacherIds[0]) {
      return { role: 'teacher', teacherId: scope.teacherIds[0], studentIds: [] };
    }
    if (roleKey === 'parent' && scope.kind === 'limited') {
      return { role: 'guardian', teacherId: null, studentIds: scope.studentIds };
    }
    return { role: 'other', teacherId: null, studentIds: [] };
  }

  private async roleKey(schoolId: number): Promise<string | null> {
    if (this.currentUserId == null) return null;
    const row = await this.db
      .select({ key: roles.key })
      .from(schoolMemberships)
      .innerJoin(roles, eq(roles.id, schoolMemberships.roleId))
      .where(and(
        eq(schoolMemberships.schoolId, schoolId),
        eq(schoolMemberships.userId, this.currentUserId),
        eq(schoolMemberships.status, 'active'),
      ))
      .get();
    return row?.key ?? null;
  }

  private async incidentRows(schoolId: number): Promise<DisciplineIncident[]> {
    const rows = await this.db
      .select({
        id: disciplineIncidents.id,
        studentId: disciplineIncidents.studentId,
        typeId: disciplineIncidents.typeId,
        severityId: disciplineIncidents.severityId,
        teacherId: disciplineIncidents.teacherId,
        description: disciplineIncidents.description,
        actionTaken: disciplineIncidents.actionTaken,
        incidentDate: disciplineIncidents.incidentDate,
        closed: disciplineIncidents.closed,
        typeName: disciplineTypes.name,
        severityName: disciplineSeverities.name,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
      })
      .from(disciplineIncidents)
      .innerJoin(disciplineTypes, eq(disciplineTypes.id, disciplineIncidents.typeId))
      .innerJoin(disciplineSeverities, eq(disciplineSeverities.id, disciplineIncidents.severityId))
      .innerJoin(students, eq(students.id, disciplineIncidents.studentId))
      .where(eq(disciplineIncidents.schoolId, schoolId))
      .orderBy(asc(disciplineIncidents.incidentDate));
    return rows.map((row) => ({
      id: row.id,
      studentId: row.studentId,
      typeId: row.typeId,
      severityId: row.severityId,
      teacherId: row.teacherId,
      description: row.description,
      actionTaken: row.actionTaken,
      incidentDate: row.incidentDate,
      closed: row.closed,
      canUpdate: false,
      line: describeIncident({
        studentName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
        incidentDate: row.incidentDate,
        typeName: row.typeName,
        severityName: row.severityName,
        closed: row.closed,
      }),
    }));
  }

  private async oneIncident(schoolId: number, incidentId: number) {
    return this.db
      .select({
        id: disciplineIncidents.id,
        studentId: disciplineIncidents.studentId,
        typeId: disciplineIncidents.typeId,
        severityId: disciplineIncidents.severityId,
        teacherId: disciplineIncidents.teacherId,
        incidentDate: disciplineIncidents.incidentDate,
        closed: disciplineIncidents.closed,
      })
      .from(disciplineIncidents)
      .where(and(eq(disciplineIncidents.id, incidentId), eq(disciplineIncidents.schoolId, schoolId)))
      .get();
  }

  private async kindRows(schoolId: number, kind: 'type' | 'severity') {
    const table = kind === 'type' ? disciplineTypes : disciplineSeverities;
    return this.db
      .select({ id: table.id, name: table.name, active: table.active })
      .from(table)
      .where(eq(table.schoolId, schoolId))
      .orderBy(asc(table.name));
  }

  private async studentChoices(schoolId: number) {
    const year = await this.db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active')))
      .get();
    if (!year) return [];
    const enrolled = await this.db
      .select({ studentId: studentEnrolments.studentId })
      .from(studentEnrolments)
      .where(and(
        eq(studentEnrolments.schoolId, schoolId),
        eq(studentEnrolments.academicYearId, year.id),
        inArray(studentEnrolments.status, ['enrolled', 'promoted']),
      ));
    const ids = [...new Set(enrolled.map((row) => row.studentId))];
    if (ids.length === 0) return [];
    const rows = await this.db
      .select({
        id: students.id,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
      })
      .from(students)
      .where(inArray(students.id, ids))
      .orderBy(asc(students.lastName));
    return rows.map((row) => ({
      id: row.id,
      name: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
    }));
  }
}
