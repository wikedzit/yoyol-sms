import { and, eq, like, asc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { school, type SelectSchool } from '../database/school';
import { schoolMemberships } from '../database/school-memberships';
import type { AppDatabase } from '../database/app-database';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';
import TenancyService from './tenancy';

const SchoolProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'School name is required')
    .max(150),

  address: z
    .string()
    .max(255)
    .optional(),

  phone: z
    .string()
    .max(30)
    .optional(),

  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),

  motto: z
    .string()
    .max(150)
    .optional(),

  registrationNumber: z
    .string()
    .max(100)
    .optional(),

  logoUrl: z
    .string()
    .max(500)
    .optional(),

  /*
   * School branding colours
   */
  primaryColor: z
    .string()
    .regex(
      /^#[0-9A-Fa-f]{6}$/,
      'Primary color must be a valid hex color'
    )
    .default('#2563eb'),

  secondaryColor: z
    .string()
    .regex(
      /^#[0-9A-Fa-f]{6}$/,
      'Secondary color must be a valid hex color'
    )
    .default('#0f172a'),
});

export type SchoolProfileInput =
  z.input<typeof SchoolProfileSchema>;

export default class SchoolService {
    async list(): Promise<SelectSchool[]> {
  return this.getAll();
}

  private db: AppDatabase;
  private ownerUserId: number | null;

  constructor(database: AppDatabase, ownerUserId: number | null) {
    this.db = database;
    this.ownerUserId = ownerUserId;
  }

  private async visibleSchoolIds(): Promise<number[]> {
    const userId = requireOwnerUserId(this.ownerUserId);
    const memberships = await this.db
      .select({ schoolId: schoolMemberships.schoolId })
      .from(schoolMemberships)
      .where(
        and(
          eq(schoolMemberships.userId, userId),
          eq(schoolMemberships.status, 'active'),
        ),
      );

    return memberships.map((membership) => membership.schoolId);
  }

  // Schools the signed-in person belongs to.
  async getAll(): Promise<SelectSchool[]> {
    try {
      const schoolIds = await this.visibleSchoolIds();
      if (schoolIds.length === 0) {
        return [];
      }

      return await this.db
        .select()
        .from(school)
        .where(inArray(school.id, schoolIds))
        .orderBy(asc(school.name));
    } catch (error) {
      console.error(
        'Error fetching schools:',
        error
      );

      return [];
    }
  }

  // Shule MOJA kwa ID
  async getById(
    id: number
  ): Promise<SelectSchool | null> {
    try {
      const schoolIds = await this.visibleSchoolIds();
      if (!schoolIds.includes(id)) {
        return null;
      }

      const result = await this.db
        .select()
        .from(school)
        .where(eq(school.id, id))
        .get();

      return result || null;
    } catch (error) {
      console.error(
        'Error fetching school:',
        error
      );

      return null;
    }
  }

  // Tafuta kwa jina
  async searchByName(
    query: string
  ): Promise<SelectSchool[]> {
    try {
      const schoolIds = await this.visibleSchoolIds();
      if (schoolIds.length === 0) {
        return [];
      }

      return await this.db
        .select()
        .from(school)
        .where(
          and(
            inArray(school.id, schoolIds),
            like(
              school.name,
              `%${query.trim()}%`
            )
          )
        )
        .orderBy(asc(school.name));
    } catch (error) {
      console.error(
        'Error searching schools:',
        error
      );

      return [];
    }
  }

  async create(
    data: SchoolProfileInput
  ): Promise<SelectSchool | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const validated = SchoolProfileSchema.parse(data);
      const now = Date.now();

      const result = await this.db
        .insert(school)
        .values({
          ...validated,
          ownerUserId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const created = result[0] ?? null;
      if (created) {
        try {
          await new TenancyService(this.db, ownerUserId).ensureSchool(
            created.id,
            ownerUserId,
          );
        } catch (membershipError) {
          console.error('Unable to create the school membership:', membershipError);
        }
      }

      return created;
    } catch (error) {
      console.error('Error creating school:', error);
      return null;
    }
  }


  // Badilisha shule ILIYOPO
  async update(
    id: number,
    data: SchoolProfileInput
  ): Promise<SelectSchool | null> {
    try {
      const schoolIds = await this.visibleSchoolIds();
      if (!schoolIds.includes(id)) {
        return null;
      }

      const validated =
        SchoolProfileSchema.parse(data);

      const result = await this.db
        .update(school)
        .set({
          ...validated,

          updatedAt: Date.now(),
        })
        .where(eq(school.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error(
        'Error updating school:',
        error
      );

      return null;
    }
  }

  // Futa shule
  async delete(
    id: number
  ): Promise<boolean> {
    try {
      const schoolIds = await this.visibleSchoolIds();
      if (!schoolIds.includes(id)) {
        return false;
      }

      const result = await this.db
        .delete(school)
        .where(eq(school.id, id))
        .returning({
          id: school.id,
        });

      return result.length > 0;
    } catch (error) {
      console.error(
        'Error deleting school:',
        error
      );

      return false;
    }
  }
}
