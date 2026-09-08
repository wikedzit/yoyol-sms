import { and, asc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

import {
  campus,
  type InsertCampus,
  type SelectCampus,
} from '../database/campuses';

import { school } from '../database/school';
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
   *
   * Security:
   * The school must belong to the currently authenticated owner.
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
   * Create a campus for a school this owner owns.
   * The first campus for that school is marked as the main campus.
   */
  async create(
    data: Omit<InsertCampus, 'id' | 'createdAt' | 'updatedAt' | 'isMain'>
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

      const existingCampuses = await this.getBySchoolId(data.schoolId);
      const isFirstCampusForSchool = existingCampuses.length === 0;

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
}
