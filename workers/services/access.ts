import { and, eq, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { permissions } from '../database/permissions';
import { rolePermissions } from '../database/role-permissions';
import { roles } from '../database/roles';
import { school } from '../database/school';
import { schoolMemberships } from '../database/school-memberships';
import { users } from '../database/users';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';
import { grantsByRole, permissionCatalog, type PermissionKey } from './permission-catalog';

export type SchoolMember = {
  membershipId: number;
  userId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleId: number;
  roleKey: string;
  roleName: string;
  status: string;
};

export type SchoolRole = {
  id: number;
  key: string;
  name: string;
  isSystem: boolean;
};

export default class AccessService {
  constructor(
    private db: DrizzleD1Database,
    private ownerUserId: number | null,
  ) {}

  async ensurePermissions(schoolId: number): Promise<void> {
    for (const permission of permissionCatalog) {
      await this.db.insert(permissions).values(permission).onConflictDoNothing();
    }

    const schoolRoles = await this.db
      .select()
      .from(roles)
      .where(eq(roles.schoolId, schoolId));

    for (const role of schoolRoles) {
      const granted = grantsByRole[role.key] ?? [];
      for (const permissionKey of granted) {
        await this.db
          .insert(rolePermissions)
          .values({ roleId: role.id, permissionKey })
          .onConflictDoNothing();
      }
    }
  }

  async can(schoolId: number, permissionKey: PermissionKey): Promise<boolean> {
    const userId = requireOwnerUserId(this.ownerUserId);
    const grant = await this.db
      .select({
        schoolStatus: school.status,
        membershipStatus: schoolMemberships.status,
      })
      .from(schoolMemberships)
      .innerJoin(school, eq(school.id, schoolMemberships.schoolId))
      .innerJoin(
        rolePermissions,
        eq(rolePermissions.roleId, schoolMemberships.roleId),
      )
      .where(
        and(
          eq(schoolMemberships.schoolId, schoolId),
          eq(schoolMemberships.userId, userId),
          eq(schoolMemberships.status, 'active'),
          eq(rolePermissions.permissionKey, permissionKey),
        ),
      )
      .get();

    if (!grant) {
      return false;
    }

    if (grant.schoolStatus === 'archived' && permissionKey !== 'school.archive') {
      return false;
    }

    return true;
  }

  async listMembers(schoolId: number): Promise<SchoolMember[]> {
    await this.requirePermission(schoolId, 'school.member.manage');
    return this.db
      .select({
        membershipId: schoolMemberships.id,
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        roleId: roles.id,
        roleKey: roles.key,
        roleName: roles.name,
        status: schoolMemberships.status,
      })
      .from(schoolMemberships)
      .innerJoin(users, eq(users.id, schoolMemberships.userId))
      .innerJoin(roles, eq(roles.id, schoolMemberships.roleId))
      .where(eq(schoolMemberships.schoolId, schoolId));
  }

  async listRoles(schoolId: number): Promise<SchoolRole[]> {
    await this.requirePermission(schoolId, 'school.role.manage');
    const rows = await this.db
      .select()
      .from(roles)
      .where(eq(roles.schoolId, schoolId));
    return rows.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      isSystem: role.isSystem,
    }));
  }

  async changeMemberRole(schoolId: number, membershipId: number, roleId: number): Promise<void> {
    await this.requirePermission(schoolId, 'school.member.manage');
    const role = await this.roleInSchool(schoolId, roleId);
    if (!role) {
      throw new Error('That role does not belong to this school.');
    }
    await this.keepLastAdmin(schoolId, membershipId, role.key);
    await this.db
      .update(schoolMemberships)
      .set({ roleId })
      .where(
        and(
          eq(schoolMemberships.id, membershipId),
          eq(schoolMemberships.schoolId, schoolId),
        ),
      );
  }

  async setMembershipStatus(
    schoolId: number,
    membershipId: number,
    status: 'active' | 'suspended',
  ): Promise<void> {
    await this.requirePermission(schoolId, 'school.member.manage');
    if (status === 'suspended') {
      await this.keepLastAdmin(schoolId, membershipId, 'suspended');
    }
    await this.db
      .update(schoolMemberships)
      .set({ status })
      .where(
        and(
          eq(schoolMemberships.id, membershipId),
          eq(schoolMemberships.schoolId, schoolId),
        ),
      );
  }

  async removeMembership(schoolId: number, membershipId: number): Promise<void> {
    await this.requirePermission(schoolId, 'school.member.manage');
    await this.keepLastAdmin(schoolId, membershipId, 'removed');
    await this.db
      .delete(schoolMemberships)
      .where(
        and(
          eq(schoolMemberships.id, membershipId),
          eq(schoolMemberships.schoolId, schoolId),
        ),
      );
  }

  async createRole(schoolId: number, name: string): Promise<void> {
    await this.requirePermission(schoolId, 'school.role.manage');
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('A role needs a name.');
    }
    const key = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!key || key in grantsByRole) {
      throw new Error('Choose a different role name.');
    }
    await this.db.insert(roles).values({
      schoolId,
      key,
      name: trimmed,
      isSystem: false,
    });
  }

  async renameRole(schoolId: number, roleId: number, name: string): Promise<void> {
    await this.requirePermission(schoolId, 'school.role.manage');
    const role = await this.roleInSchool(schoolId, roleId);
    if (!role || role.isSystem) {
      throw new Error('Built-in roles stay as they are.');
    }
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('A role needs a name.');
    }
    await this.db
      .update(roles)
      .set({ name: trimmed })
      .where(eq(roles.id, role.id));
  }

  async deleteRole(schoolId: number, roleId: number): Promise<void> {
    await this.requirePermission(schoolId, 'school.role.manage');
    const role = await this.roleInSchool(schoolId, roleId);
    if (!role || role.isSystem) {
      throw new Error('Built-in roles cannot be deleted.');
    }
    const assigned = await this.db
      .select({ id: schoolMemberships.id })
      .from(schoolMemberships)
      .where(eq(schoolMemberships.roleId, role.id))
      .get();
    if (assigned) {
      throw new Error('Move members off this role before deleting it.');
    }
    await this.db.delete(roles).where(eq(roles.id, role.id));
  }

  async setSchoolStatus(schoolId: number, status: 'active' | 'archived'): Promise<void> {
    await this.requirePermission(schoolId, 'school.archive');
    await this.db
      .update(school)
      .set({ status, updatedAt: Date.now() })
      .where(eq(school.id, schoolId));
  }

  private async requirePermission(schoolId: number, permissionKey: PermissionKey): Promise<void> {
    const allowed = await this.can(schoolId, permissionKey);
    if (!allowed) {
      throw new Error('You do not have permission to do that.');
    }
  }

  private async roleInSchool(schoolId: number, roleId: number) {
    return this.db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.schoolId, schoolId)))
      .get();
  }

  private async keepLastAdmin(
    schoolId: number,
    membershipId: number,
    nextRoleKey: string,
  ): Promise<void> {
    const membership = await this.db
      .select({ roleKey: roles.key })
      .from(schoolMemberships)
      .innerJoin(roles, eq(roles.id, schoolMemberships.roleId))
      .where(
        and(
          eq(schoolMemberships.id, membershipId),
          eq(schoolMemberships.schoolId, schoolId),
          eq(schoolMemberships.status, 'active'),
        ),
      )
      .get();

    if (membership?.roleKey !== 'admin' || nextRoleKey === 'admin') {
      return;
    }

    const adminCount = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(schoolMemberships)
      .innerJoin(roles, eq(roles.id, schoolMemberships.roleId))
      .where(
        and(
          eq(schoolMemberships.schoolId, schoolId),
          eq(schoolMemberships.status, 'active'),
          eq(roles.key, 'admin'),
        ),
      )
      .get();

    if ((adminCount?.total ?? 0) <= 1) {
      throw new Error('The school needs at least one active admin.');
    }
  }
}
