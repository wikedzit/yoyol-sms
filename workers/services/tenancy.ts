import { and, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { roles } from '../database/roles';
import { school } from '../database/school';
import { schoolMemberships } from '../database/school-memberships';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';
import AccessService from './access';

const systemRoles = [
  { key: 'admin', name: 'Admin' },
  { key: 'teacher', name: 'Teacher' },
  { key: 'finance', name: 'Finance' },
  { key: 'student', name: 'Student' },
  { key: 'parent', name: 'Parent' },
] as const;

export default class TenancyService {
  constructor(
    private db: DrizzleD1Database,
    private ownerUserId: number | null,
  ) {}

  async ensureForCurrentOwner(): Promise<void> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const schools = await this.db
        .select({ id: school.id })
        .from(school)
        .where(eq(school.ownerUserId, ownerUserId));

      for (const ownedSchool of schools) {
        await this.ensureSchool(ownedSchool.id, ownerUserId);
      }
    } catch (error) {
      console.error('Unable to ensure school memberships:', error);
    }
  }

  async ensureSchool(schoolId: number, ownerUserId: number): Promise<void> {
    for (const systemRole of systemRoles) {
      const existingRole = await this.db
        .select({ id: roles.id })
        .from(roles)
        .where(and(eq(roles.schoolId, schoolId), eq(roles.key, systemRole.key)))
        .get();

      if (!existingRole) {
        await this.db.insert(roles).values({
          schoolId,
          key: systemRole.key,
          name: systemRole.name,
          isSystem: true,
        });
      }
    }

    const adminRole = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.schoolId, schoolId), eq(roles.key, 'admin')))
      .get();

    if (!adminRole) {
      return;
    }

    await new AccessService(this.db, ownerUserId).ensurePermissions(schoolId);

    const membership = await this.db
      .select({ id: schoolMemberships.id })
      .from(schoolMemberships)
      .where(
        and(
          eq(schoolMemberships.schoolId, schoolId),
          eq(schoolMemberships.userId, ownerUserId),
        ),
      )
      .get();

    if (membership) {
      return;
    }

    await this.db.insert(schoolMemberships).values({
      schoolId,
      userId: ownerUserId,
      roleId: adminRole.id,
      status: 'active',
      createdAt: Date.now(),
    });
  }
}
