import { and, asc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { guardians } from '../database/guardians';
import { permissions } from '../database/permissions';
import { rolePermissions } from '../database/role-permissions';
import { roles } from '../database/roles';
import { schoolMemberships } from '../database/school-memberships';
import { staff } from '../database/staff';
import { studentGuardians } from '../database/student-guardians';
import { users } from '../database/users';
import {
  corePermissions,
  defaultGrantsByRoleKey,
  systemRoles,
} from './permission-catalog';

export default class SchoolAccess {
  constructor(
    private database: DrizzleD1Database,
    private userId: number | null,
  ) {}

  // The oldest active membership is the school for this request.
  // A school switcher can replace this once a person belongs to several schools.
  async currentSchoolId(): Promise<number | null> {
    if (this.userId == null) {
      return null;
    }

    const membership = await this.database
      .select({ schoolId: schoolMemberships.schoolId })
      .from(schoolMemberships)
      .where(
        and(
          eq(schoolMemberships.userId, this.userId),
          eq(schoolMemberships.status, 'active'),
        ),
      )
      .orderBy(asc(schoolMemberships.id))
      .limit(1)
      .get();

    return membership?.schoolId ?? null;
  }

  async isMemberOf(schoolId: number): Promise<boolean> {
    if (this.userId == null) {
      return false;
    }

    const membership = await this.database
      .select({ id: schoolMemberships.id })
      .from(schoolMemberships)
      .where(
        and(
          eq(schoolMemberships.userId, this.userId),
          eq(schoolMemberships.schoolId, schoolId),
          eq(schoolMemberships.status, 'active'),
        ),
      )
      .get();

    return membership != null;
  }

  async can(permissionKey: string, schoolId?: number): Promise<boolean> {
    if (this.userId == null) {
      return false;
    }

    const targetSchoolId = schoolId ?? (await this.currentSchoolId());
    if (targetSchoolId == null) {
      return false;
    }

    const grant = await this.database
      .select({ permissionKey: rolePermissions.permissionKey })
      .from(schoolMemberships)
      .innerJoin(
        rolePermissions,
        eq(rolePermissions.roleId, schoolMemberships.roleId),
      )
      .where(
        and(
          eq(schoolMemberships.userId, this.userId),
          eq(schoolMemberships.schoolId, targetSchoolId),
          eq(schoolMemberships.status, 'active'),
          eq(rolePermissions.permissionKey, permissionKey),
        ),
      )
      .get();

    return grant != null;
  }

  // The current school, when this person may perform the action there.
  async schoolFor(permissionKey: string): Promise<number | null> {
    const schoolId = await this.currentSchoolId();
    if (schoolId == null) {
      return null;
    }

    const allowed = await this.can(permissionKey, schoolId);
    if (!allowed) {
      return null;
    }

    return schoolId;
  }

  // Called when a school is created, so the creator becomes its administrator.
  async prepareNewSchool(schoolId: number, adminUserId: number): Promise<void> {
    await this.ensurePermissions();
    await this.ensureSystemRoles(schoolId);
    await this.ensureRolePermissions(schoolId);
    await this.ensureAdminMembership(schoolId, adminUserId);
  }

  async deleteRole(roleId: number): Promise<void> {
    const role = await this.database
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .get();

    if (!role) {
      throw new Error('Role was not found.');
    }

    if (role.isSystem) {
      throw new Error('System roles cannot be deleted.');
    }

    const allowed = await this.can('school.role.delete', role.schoolId);
    if (!allowed) {
      throw new Error('You cannot change roles in this school.');
    }

    await this.database.delete(roles).where(eq(roles.id, roleId));
  }

  private async ensurePermissions(): Promise<void> {
    for (const permission of corePermissions) {
      await this.database
        .insert(permissions)
        .values(permission)
        .onConflictDoNothing();
    }
  }

  private async ensureSystemRoles(schoolId: number): Promise<void> {
    for (const role of systemRoles) {
      await this.database
        .insert(roles)
        .values({
          schoolId,
          key: role.key,
          name: role.name,
          isSystem: true,
        })
        .onConflictDoNothing();
    }
  }

  private async ensureRolePermissions(schoolId: number): Promise<void> {
    const schoolRoles = await this.database
      .select()
      .from(roles)
      .where(eq(roles.schoolId, schoolId));

    const everyPermissionKey = corePermissions.map((permission) => permission.key);

    for (const role of schoolRoles) {
      const grantedKeys =
        role.key === 'admin'
          ? everyPermissionKey
          : (defaultGrantsByRoleKey[role.key] ?? []);

      for (const permissionKey of grantedKeys) {
        await this.database
          .insert(rolePermissions)
          .values({ roleId: role.id, permissionKey })
          .onConflictDoNothing();
      }
    }
  }

  private async ensureAdminMembership(
    schoolId: number,
    adminUserId: number,
  ): Promise<void> {
    const adminRole = await this.database
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.schoolId, schoolId), eq(roles.key, 'admin')))
      .get();

    if (!adminRole) {
      throw new Error('The administrator role was not created for this school.');
    }

    await this.database
      .insert(schoolMemberships)
      .values({
        schoolId,
        userId: adminUserId,
        roleId: adminRole.id,
        status: 'active',
      })
      .onConflictDoNothing();

    const adminUser = await this.database
      .select()
      .from(users)
      .where(eq(users.id, adminUserId))
      .get();

    if (!adminUser) {
      throw new Error('The school administrator account was not found.');
    }

    await this.ensureStaffMember({
      schoolId,
      userId: adminUserId,
      firstName: adminUser.firstName?.trim() || 'School',
      lastName: adminUser.lastName?.trim() || 'Administrator',
      email: adminUser.email,
      phone: adminUser.phone,
      jobTitle: 'Administrator',
    });
  }

  // Creates the staff row for this school and stores its id on the membership.
  async ensureStaffMember(input: {
    schoolId: number;
    userId?: number | null;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    jobTitle: string;
    status?: string;
  }): Promise<number | null> {
    const linkedUserId = input.userId ?? null;
    const existing = await this.findStaffMember(
      input.schoolId,
      linkedUserId,
      input.email,
    );

    const staffId = existing
      ? existing.id
      : await this.insertStaffMember({ ...input, userId: linkedUserId });

    if (staffId != null && linkedUserId != null) {
      await this.database
        .update(schoolMemberships)
        .set({ staffId })
        .where(
          and(
            eq(schoolMemberships.schoolId, input.schoolId),
            eq(schoolMemberships.userId, linkedUserId),
          ),
        );
    }

    return staffId;
  }

  // Creates the guardian, links the student, and stores the id on that person's membership.
  async recordStudentGuardian(input: {
    schoolId: number;
    studentId: number;
    guardianName: string;
    phone?: string | null;
  }): Promise<void> {
    const guardianName = input.guardianName.trim();
    if (!guardianName) {
      return;
    }

    const { firstName, lastName } = splitPersonName(guardianName);
    const phone = input.phone?.trim() || null;
    const existing = await this.findGuardian(input.schoolId, firstName, lastName, phone);
    const guardianId = existing
      ? existing.id
      : await this.insertGuardian(input.schoolId, firstName, lastName, phone);

    if (guardianId == null) {
      return;
    }

    await this.database
      .insert(studentGuardians)
      .values({ studentId: input.studentId, guardianId })
      .onConflictDoNothing();

    const guardianUserId = existing?.userId;
    if (guardianUserId == null) {
      return;
    }

    await this.database
      .update(schoolMemberships)
      .set({ guardianId })
      .where(
        and(
          eq(schoolMemberships.schoolId, input.schoolId),
          eq(schoolMemberships.userId, guardianUserId),
        ),
      );
  }

  private async findStaffMember(
    schoolId: number,
    userId: number | null,
    email?: string | null,
  ) {
    if (userId != null) {
      return this.database
        .select({ id: staff.id })
        .from(staff)
        .where(and(eq(staff.schoolId, schoolId), eq(staff.userId, userId)))
        .get();
    }

    if (!email) {
      return undefined;
    }

    return this.database
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.schoolId, schoolId), eq(staff.email, email)))
      .get();
  }

  private async insertStaffMember(input: {
    schoolId: number;
    userId: number | null;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    jobTitle: string;
    status?: string;
  }): Promise<number | null> {
    const now = Date.now();
    const inserted = await this.database
      .insert(staff)
      .values({
        schoolId: input.schoolId,
        userId: input.userId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        jobTitle: input.jobTitle,
        status: input.status || 'Active',
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: staff.id });

    return inserted[0]?.id ?? null;
  }

  private async findGuardian(
    schoolId: number,
    firstName: string,
    lastName: string,
    phone: string | null,
  ) {
    const rows = await this.database
      .select()
      .from(guardians)
      .where(
        and(
          eq(guardians.schoolId, schoolId),
          eq(guardians.firstName, firstName),
          eq(guardians.lastName, lastName),
        ),
      );

    return rows.find((guardian) => (guardian.phone ?? null) === phone);
  }

  private async insertGuardian(
    schoolId: number,
    firstName: string,
    lastName: string,
    phone: string | null,
  ): Promise<number | null> {
    const now = Date.now();
    const inserted = await this.database
      .insert(guardians)
      .values({
        schoolId,
        firstName,
        lastName,
        phone,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: guardians.id });

    return inserted[0]?.id ?? null;
  }
}

function splitPersonName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const spaceAt = trimmed.indexOf(' ');
  if (spaceAt === -1) {
    return { firstName: trimmed, lastName: '' };
  }

  return {
    firstName: trimmed.slice(0, spaceAt),
    lastName: trimmed.slice(spaceAt + 1).trim(),
  };
}
