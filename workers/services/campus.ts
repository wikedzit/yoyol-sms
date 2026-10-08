import { and, asc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import {
  campus,
  type InsertCampus,
  type SelectCampus,
} from '../database/campuses';

import { students } from '../database/students';
import { teachers } from '../database/teachers';
import type SchoolAccess from './school-access';

export default class CampusService {
  constructor(
    private db: DrizzleD1Database,
    private schoolAccess: SchoolAccess,
  ) {}

  private async canUseSchool(
    schoolId: number,
    permissionKey: string,
  ): Promise<boolean> {
    const member = await this.schoolAccess.isMemberOf(schoolId);
    if (!member) {
      return false;
    }

    return this.schoolAccess.can(permissionKey, schoolId);
  }

  /**
   * Get all campuses belonging to one school.
   */
  async getBySchoolId(
    schoolId: number
  ): Promise<SelectCampus[]> {
    try {
      const allowed = await this.canUseSchool(schoolId, 'school.school.read');
      if (!allowed) {
        return [];
      }

      return await this.db
        .select()
        .from(campus)
        .where(eq(campus.schoolId, schoolId))
        .orderBy(asc(campus.id));
    } catch (error) {
      console.error(
        'Error fetching campuses:',
        error
      );

      return [];
    }
  }

  /**
   * Get one campus by ID.
   */
  async getById(
    id: number
  ): Promise<SelectCampus | null> {
    try {
      const result = await this.db
        .select()
        .from(campus)
        .where(eq(campus.id, id))
        .get();

      if (!result) {
        return null;
      }

      const allowed = await this.canUseSchool(result.schoolId, 'school.school.read');
      if (!allowed) {
        return null;
      }

      return result;
    } catch (error) {
      console.error(
        'Error fetching campus:',
        error
      );

      return null;
    }
  }

  /**
   * Create a campus.
   * The first campus is automatically the main campus.
   */
  async create(
    data: Omit<
      InsertCampus,
      'id' | 'createdAt' | 'updatedAt' | 'isMain'
    >
  ): Promise<SelectCampus | null> {
    try {
      const allowed = await this.canUseSchool(
        data.schoolId,
        'school.school.update',
      );
      if (!allowed) {
        return null;
      }

      const existingCampuses =
        await this.getBySchoolId(data.schoolId);

      const isFirstCampusForSchool =
        existingCampuses.length === 0;

      const result = await this.db
        .insert(campus)
        .values({
          ...data,
          isMain: isFirstCampusForSchool,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      return result[0] ?? null;
    } catch (error) {
      console.error(
        'Error creating campus:',
        error
      );

      return null;
    }
  }

  /**
   * Update a campus.
   *
   * Security:
   * The campus must belong to a school
   * owned by the current user.
   */
  async update(
    id: number,
    data: Partial<
      Pick<
        InsertCampus,
        | 'name'
        | 'code'
        | 'address'
        | 'phone'
        | 'email'
        | 'isMain'
      >
    >
  ): Promise<SelectCampus | null> {
    try {
      const existingCampus = await this.getById(id);
      if (!existingCampus) {
        return null;
      }

      const allowed = await this.canUseSchool(
        existingCampus.schoolId,
        'school.school.update',
      );
      if (!allowed) {
        return null;
      }

      const result = await this.db
        .update(campus)
        .set({
          ...data,
          updatedAt: Date.now(),
        })
        .where(
          eq(campus.id, id)
        )
        .returning();

      return result[0] ?? null;
    } catch (error) {
      console.error(
        'Error updating campus:',
        error
      );

      return null;
    }
  }

  /**
   * Delete a campus.
   *
   * Security:
   * The campus must belong to a school
   * owned by the current user.
   */
  async delete(
    id: number
  ): Promise<boolean> {
    try {
      const existingCampus = await this.getById(id);
      if (!existingCampus) {
        return false;
      }

      const allowed = await this.canUseSchool(
        existingCampus.schoolId,
        'school.school.update',
      );
      if (!allowed) {
        return false;
      }

    // Students and teachers belong to this campus. Remove them
    // before the campus row, because the database link only
    // clears campus_id and would otherwise leave the people behind.
    await this.db
      .delete(students)
      .where(
        and(
          eq(students.campusId, id),
          eq(students.schoolId, existingCampus.schoolId),
        ),
      );

    await this.db
      .delete(teachers)
      .where(
        and(
          eq(teachers.campusId, id),
          eq(teachers.schoolId, existingCampus.schoolId),
        ),
      );

    await this.db
      .delete(campus)
      .where(
        eq(campus.id, id)
      );

      return true;
    } catch (error) {
      console.error(
        'Error deleting campus:',
        error
      );

      return false;
    }
  }
}
