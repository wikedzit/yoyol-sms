import { and, asc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { guardianStudents, guardians } from '../database/guardians';
import { roles } from '../database/roles';
import { studentGuardians } from '../database/student-guardians';
import { students } from '../database/students';
import { refusalToInviteGuardian } from '../kernel/guardian-accounts';
import {
  primaryContactPlan,
  refusalToLinkTwice,
  refusalToRemoveLinkedGuardian,
} from '../kernel/guardians';
import { requireSchoolId } from '../utils/require-owner-user';

export type GuardianLinkView = {
  id: number;
  studentId: number;
  studentName: string;
  relationship: string;
  primary: boolean;
};

export type GuardianView = {
  id: number;
  fullName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  userId: number | null;
  links: GuardianLinkView[];
};

type GuardianDetails = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
};

export default class GuardianService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
  ) {}

  async list(): Promise<GuardianView[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const people = await this.db
      .select()
      .from(guardians)
      .where(eq(guardians.schoolId, schoolId))
      .orderBy(asc(guardians.fullName));
    const links = await this.linksForSchool(schoolId);
    return people.map((person) => ({
      id: person.id,
      fullName: person.fullName,
      phone: person.phone,
      email: person.email,
      address: person.address,
      userId: person.userId,
      links: links.filter((link) => link.guardianId === person.id),
    }));
  }

  async students(): Promise<{ id: number; name: string }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const rows = await this.db
      .select({
        id: students.id,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
      })
      .from(students)
      .where(eq(students.schoolId, schoolId))
      .orderBy(asc(students.lastName), asc(students.firstName));
    return rows.map((row) => ({
      id: row.id,
      name: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
    }));
  }

  async create(details: GuardianDetails): Promise<{ error: string } | { id: number }> {
    const fullName = details.fullName.trim();
    if (fullName.length === 0) {
      return { error: 'Enter the guardian name.' };
    }
    const schoolId = requireSchoolId(this.activeSchoolId);
    const now = Date.now();
    const created = await this.db.insert(guardians).values({
      schoolId,
      fullName,
      phone: blankToNull(details.phone),
      email: blankToNull(details.email),
      address: blankToNull(details.address),
      createdAt: now,
      updatedAt: now,
    }).returning({ id: guardians.id });
    return { id: created[0]?.id ?? 0 };
  }

  async update(guardianId: number, details: GuardianDetails): Promise<{ error: string } | { id: number }> {
    const fullName = details.fullName.trim();
    if (fullName.length === 0) {
      return { error: 'Enter the guardian name.' };
    }
    const schoolId = requireSchoolId(this.activeSchoolId);
    const owned = await this.ownedGuardian(schoolId, guardianId);
    if (!owned) {
      return { error: 'That guardian was not found.' };
    }
    await this.db.update(guardians).set({
      fullName,
      phone: blankToNull(details.phone),
      email: blankToNull(details.email),
      address: blankToNull(details.address),
      updatedAt: Date.now(),
    }).where(eq(guardians.id, guardianId));
    return { id: guardianId };
  }

  async remove(guardianId: number): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const owned = await this.ownedGuardian(schoolId, guardianId);
    if (!owned) {
      return { error: 'That guardian was not found.' };
    }
    const links = await this.db
      .select({ id: guardianStudents.id })
      .from(guardianStudents)
      .where(eq(guardianStudents.guardianId, guardianId));
    const refusal = refusalToRemoveLinkedGuardian(links.length);
    if (refusal) {
      return { error: refusal };
    }
    await this.db.delete(guardians).where(eq(guardians.id, guardianId));
    return { id: guardianId };
  }

  async link(input: {
    guardianId: number;
    studentId: number;
    relationship: string;
    primary: boolean;
  }): Promise<{ error: string } | { id: number }> {
    const relationship = input.relationship.trim();
    if (relationship.length === 0) {
      return { error: 'Enter the relationship.' };
    }
    const schoolId = requireSchoolId(this.activeSchoolId);
    if (!(await this.ownedGuardian(schoolId, input.guardianId))) {
      return { error: 'That guardian was not found.' };
    }
    if (!(await this.ownedStudent(schoolId, input.studentId))) {
      return { error: 'That student was not found.' };
    }
    const existing = await this.db
      .select({ id: guardianStudents.id })
      .from(guardianStudents)
      .where(and(
        eq(guardianStudents.guardianId, input.guardianId),
        eq(guardianStudents.studentId, input.studentId),
      ))
      .get();
    const duplicate = refusalToLinkTwice(Boolean(existing));
    if (duplicate) {
      return { error: duplicate };
    }
    if (input.primary) {
      await this.clearPrimary(input.studentId);
    }
    const created = await this.db.insert(guardianStudents).values({
      schoolId,
      guardianId: input.guardianId,
      studentId: input.studentId,
      relationship,
      isPrimary: input.primary,
      createdAt: Date.now(),
    }).returning({ id: guardianStudents.id });
    await this.copyAccountLink(schoolId, input.guardianId, input.studentId);
    return { id: created[0]?.id ?? 0 };
  }

  async unlink(linkId: number): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const link = await this.ownedLink(schoolId, linkId);
    if (!link) {
      return { error: 'That guardian link was not found.' };
    }
    await this.removeAccountLink(schoolId, link.guardianId, link.studentId);
    await this.db.delete(guardianStudents).where(eq(guardianStudents.id, linkId));
    return { id: linkId };
  }

  async makePrimary(linkId: number): Promise<{ error: string } | { id: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const link = await this.ownedLink(schoolId, linkId);
    if (!link) {
      return { error: 'That guardian link was not found.' };
    }
    const links = await this.db
      .select({
        id: guardianStudents.id,
        studentId: guardianStudents.studentId,
        isPrimary: guardianStudents.isPrimary,
      })
      .from(guardianStudents)
      .where(eq(guardianStudents.studentId, link.studentId));
    try {
      const plan = primaryContactPlan(links, linkId);
      for (const clearId of plan.clearIds) {
        await this.db
          .update(guardianStudents)
          .set({ isPrimary: false })
          .where(eq(guardianStudents.id, clearId));
      }
      await this.db
        .update(guardianStudents)
        .set({ isPrimary: true })
        .where(eq(guardianStudents.id, plan.primaryId));
      return { id: linkId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'That primary contact could not be saved.';
      return { error: message };
    }
  }

  async prepareInvite(guardianId: number): Promise<{ error: string } | { schoolId: number; email: string; roleId: number }> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const guardian = await this.db
      .select({ email: guardians.email, userId: guardians.userId })
      .from(guardians)
      .where(and(eq(guardians.id, guardianId), eq(guardians.schoolId, schoolId)))
      .get();
    if (!guardian) {
      return { error: 'That guardian was not found.' };
    }
    const refusal = refusalToInviteGuardian(guardian);
    if (refusal) {
      return { error: refusal };
    }
    const role = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.schoolId, schoolId), eq(roles.key, 'parent')))
      .get();
    if (!role) {
      return { error: 'This school has no parent role.' };
    }
    return { schoolId, email: (guardian.email ?? '').trim(), roleId: role.id };
  }

  private async copyAccountLink(schoolId: number, guardianId: number, studentId: number) {
    const guardian = await this.accountUser(schoolId, guardianId);
    if (!guardian?.userId) return;
    const existing = await this.db
      .select({ id: studentGuardians.id })
      .from(studentGuardians)
      .where(and(
        eq(studentGuardians.studentId, studentId),
        eq(studentGuardians.userId, guardian.userId),
      ))
      .get();
    if (existing) return;
    await this.db.insert(studentGuardians).values({
      schoolId,
      studentId,
      userId: guardian.userId,
    });
  }

  private async removeAccountLink(schoolId: number, guardianId: number, studentId: number) {
    const guardian = await this.accountUser(schoolId, guardianId);
    if (!guardian?.userId) return;
    await this.db
      .delete(studentGuardians)
      .where(and(
        eq(studentGuardians.schoolId, schoolId),
        eq(studentGuardians.studentId, studentId),
        eq(studentGuardians.userId, guardian.userId),
      ));
  }

  private async accountUser(schoolId: number, guardianId: number) {
    return this.db
      .select({ userId: guardians.userId })
      .from(guardians)
      .where(and(eq(guardians.id, guardianId), eq(guardians.schoolId, schoolId)))
      .get();
  }

  private async linksForSchool(schoolId: number): Promise<(GuardianLinkView & { guardianId: number })[]> {
    const rows = await this.db
      .select({
        id: guardianStudents.id,
        guardianId: guardianStudents.guardianId,
        studentId: students.id,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
        relationship: guardianStudents.relationship,
        isPrimary: guardianStudents.isPrimary,
      })
      .from(guardianStudents)
      .innerJoin(students, eq(students.id, guardianStudents.studentId))
      .where(eq(guardianStudents.schoolId, schoolId))
      .orderBy(asc(students.lastName), asc(students.firstName));
    return rows.map((row) => ({
      id: row.id,
      guardianId: row.guardianId,
      studentId: row.studentId,
      studentName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '),
      relationship: row.relationship,
      primary: row.isPrimary,
    }));
  }

  private async clearPrimary(studentId: number) {
    await this.db
      .update(guardianStudents)
      .set({ isPrimary: false })
      .where(and(eq(guardianStudents.studentId, studentId), eq(guardianStudents.isPrimary, true)));
  }

  private async ownedGuardian(schoolId: number, guardianId: number) {
    return this.db
      .select({ id: guardians.id })
      .from(guardians)
      .where(and(eq(guardians.id, guardianId), eq(guardians.schoolId, schoolId)))
      .get();
  }

  private async ownedStudent(schoolId: number, studentId: number) {
    return this.db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .get();
  }

  private async ownedLink(schoolId: number, linkId: number) {
    return this.db
      .select({
        id: guardianStudents.id,
        studentId: guardianStudents.studentId,
        guardianId: guardianStudents.guardianId,
      })
      .from(guardianStudents)
      .where(and(eq(guardianStudents.id, linkId), eq(guardianStudents.schoolId, schoolId)))
      .get();
  }
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
