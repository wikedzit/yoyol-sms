import { and, eq, isNull } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { guardianStudents, guardians } from '../database/guardians';
import { invitations, type SelectInvitation } from '../database/invitations';
import { roles } from '../database/roles';
import { schoolMemberships } from '../database/school-memberships';
import { studentGuardians } from '../database/student-guardians';
import { users } from '../database/users';
import {
  hashPassword,
  passwordIsStrong,
  WEAK_PASSWORD_MESSAGE,
} from '../utils/password.server';
import { requireOwnerUserId } from '../utils/require-owner-user';

const INVITE_MS = 1000 * 60 * 60 * 24 * 7;

export type ListedInvitation = SelectInvitation & { roleName: string };

export default class InvitationService {
  constructor(
    private db: AppDatabase,
    private ownerUserId: number | null,
  ) {}

  async listForSchool(schoolId: number): Promise<ListedInvitation[]> {
    const rows = await this.db
      .select({
        invitation: invitations,
        roleName: roles.name,
      })
      .from(invitations)
      .innerJoin(roles, eq(roles.id, invitations.roleId))
      .where(and(eq(invitations.schoolId, schoolId), isNull(invitations.acceptedAt)));

    return rows.map((row) => ({ ...row.invitation, roleName: row.roleName }));
  }

  async create(input: {
    schoolId: number;
    email?: string;
    phone?: string;
    roleId: number;
    teacherId?: number | null;
    studentId?: number | null;
    guardianId?: number | null;
  }): Promise<{ token: string }> {
    const createdBy = requireOwnerUserId(this.ownerUserId);
    const contact = (input.email || '').trim().toLowerCase();
    const phone = (input.phone || '').trim();
    if (!contact && !phone) {
      throw new Error('Enter an email or a phone number.');
    }

    const token = randomToken();
    await this.db.insert(invitations).values({
      schoolId: input.schoolId,
      email: contact || null,
      phone: phone || null,
      roleId: input.roleId,
      tokenHash: await sha256(token),
      teacherId: input.teacherId ?? null,
      studentId: input.studentId ?? null,
      guardianId: input.guardianId ?? null,
      expiresAt: Date.now() + INVITE_MS,
      createdBy,
      createdAt: Date.now(),
    });

    return { token };
  }

  async accept(token: string, password: string): Promise<{ userId: number } | { error: string }> {
    if (!passwordIsStrong(password)) {
      return { error: WEAK_PASSWORD_MESSAGE };
    }

    const invitation = await this.db
      .select()
      .from(invitations)
      .where(eq(invitations.tokenHash, await sha256(token)))
      .get();

    if (!invitation || invitation.acceptedAt || invitation.expiresAt <= Date.now()) {
      return { error: 'This invitation is no longer valid.' };
    }
    if (!invitation.email) {
      return { error: 'This invitation needs an email before it can be accepted.' };
    }

    let user = await this.db
      .select()
      .from(users)
      .where(eq(users.email, invitation.email))
      .get();

    if (!user) {
      const created = await this.db
        .insert(users)
        .values({
          email: invitation.email,
          passwordHash: await hashPassword(password),
          role: 'teacher',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();
      user = created[0];
    }

    if (!user) return { error: 'Could not accept that invitation.' };

    const existing = await this.db
      .select({ id: schoolMemberships.id })
      .from(schoolMemberships)
      .where(
        and(
          eq(schoolMemberships.schoolId, invitation.schoolId),
          eq(schoolMemberships.userId, user.id),
        ),
      )
      .get();

    if (!existing) {
      await this.db.insert(schoolMemberships).values({
        schoolId: invitation.schoolId,
        userId: user.id,
        roleId: invitation.roleId,
        teacherId: invitation.teacherId,
        studentId: invitation.studentId,
        status: 'active',
        createdAt: Date.now(),
      });
    }

    if (invitation.guardianId) {
      await attachGuardianAccount(this.db, invitation.schoolId, invitation.guardianId, user.id);
    }

    await this.db
      .update(invitations)
      .set({ acceptedAt: Date.now() })
      .where(eq(invitations.id, invitation.id));

    return { userId: user.id };
  }
}

async function attachGuardianAccount(
  db: AppDatabase,
  schoolId: number,
  guardianId: number,
  userId: number,
) {
  await db
    .update(guardians)
    .set({ userId, updatedAt: Date.now() })
    .where(and(
      eq(guardians.id, guardianId),
      eq(guardians.schoolId, schoolId),
      isNull(guardians.userId),
    ));

  const links = await db
    .select({ studentId: guardianStudents.studentId })
    .from(guardianStudents)
    .where(and(
      eq(guardianStudents.guardianId, guardianId),
      eq(guardianStudents.schoolId, schoolId),
    ));

  for (const link of links) {
    const existing = await db
      .select({ id: studentGuardians.id })
      .from(studentGuardians)
      .where(and(
        eq(studentGuardians.studentId, link.studentId),
        eq(studentGuardians.userId, userId),
      ))
      .get();
    if (existing) continue;
    await db.insert(studentGuardians).values({
      schoolId,
      studentId: link.studentId,
      userId,
    });
  }
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
