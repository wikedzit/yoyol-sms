import { and, asc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import {
  campus,
  type InsertCampus,
  type SelectCampus,
} from '../database/campuses';

import { school } from '../database/school';
import { students } from '../database/students';
import { teachers } from '../database/teachers';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';

export default class CampusService {
  private db: DrizzleD1Database;
  private ownerUserId: number | null;

  constructor(
    database: DrizzleD1Database,
    ownerUserId: number | null
  ) {
    this.db = database;
    this.ownerUserId = ownerUserId;
  }

  /**
   * Get all campuses belonging to one school.
   */
  async getBySchoolId(
    schoolId: number
  ): Promise<SelectCampus[]> {
    try {
      const ownerUserId =
        requireOwnerUserId(this.ownerUserId);

      const result = await this.db
        .select({
          campus,
        })
        .from(campus)
        .innerJoin(
          school,
          eq(campus.schoolId, school.id)
        )
        .where(
          and(
            eq(campus.schoolId, schoolId),
            eq(school.ownerUserId, ownerUserId)
          )
        )
        .orderBy(asc(campus.id));

      return result.map((row) => row.campus);
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
      const ownerUserId =
        requireOwnerUserId(this.ownerUserId);

      const result = await this.db
        .select({
          campus,
        })
        .from(campus)
        .innerJoin(
          school,
          eq(campus.schoolId, school.id)
        )
        .where(
          and(
            eq(campus.id, id),
            eq(school.ownerUserId, ownerUserId)
          )
        )
        .get();

      return result?.campus ?? null;
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
      const ownerUserId =
        requireOwnerUserId(this.ownerUserId);

      const existingSchool = await this.db
        .select({
          id: school.id,
        })
        .from(school)
        .where(
          and(
            eq(school.id, data.schoolId),
            eq(school.ownerUserId, ownerUserId)
          )
        )
        .get();

      if (!existingSchool) {
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
      const ownerUserId =
        requireOwnerUserId(this.ownerUserId);

      // Verify ownership first.
      const existingCampus =
        await this.db
          .select({
            id: campus.id,
          })
          .from(campus)
          .innerJoin(
            school,
            eq(campus.schoolId, school.id)
          )
          .where(
            and(
              eq(campus.id, id),
              eq(
                school.ownerUserId,
                ownerUserId
              )
            )
          )
          .get();

      if (!existingCampus) {
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
    const ownerUserId = 
      requireOwnerUserId(this.ownerUserId);

      // Verify ownership first.
    const existingCampus = 
      await this.db
         .select({
           id: campus.id,
           isMain: campus.isMain,
      })
      .from(campus)
      .innerJoin(
        school,
        eq(campus.schoolId, school.id)
      )
      .where(
        and(
          eq(campus.id, id),
          eq(
            school.ownerUserId, 
            ownerUserId
          )
        )
      )
      .get();

    if (!existingCampus) {
      return false;
    }
    
    // Main campus cannot be deleted.
    if (existingCampus.isMain) {
      console.warn(
        `Attempted to delete main campus: ${id}`
      );
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
          eq(students.ownerUserId, ownerUserId),
        ),
      );

    await this.db
      .delete(teachers)
      .where(
        and(
          eq(teachers.campusId, id),
          eq(teachers.ownerUserId, ownerUserId),
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