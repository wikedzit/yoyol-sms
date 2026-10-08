import { and, eq, like, asc } from 'drizzle-orm';
import { z } from 'zod';
import { school, type SelectSchool } from '../database/school';
import { schoolMemberships } from '../database/school-memberships';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';
import type SchoolAccess from './school-access';

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

  private db: DrizzleD1Database;
  private signedInUserId: number | null;
  private schoolAccess: SchoolAccess;

  constructor(
    database: DrizzleD1Database,
    signedInUserId: number | null,
    schoolAccess: SchoolAccess,
  ) {
    this.db = database;
    this.signedInUserId = signedInUserId;
    this.schoolAccess = schoolAccess;
  }

  // Orodha ya shule za mmiliki
  async getAll(): Promise<SelectSchool[]> {
    try {
      const userId = requireOwnerUserId(this.signedInUserId);

      const rows = await this.db
        .select()
        .from(school)
        .innerJoin(
          schoolMemberships,
          eq(schoolMemberships.schoolId, school.id),
        )
        .where(
          and(
            eq(schoolMemberships.userId, userId),
            eq(schoolMemberships.status, 'active'),
          ),
        )
        .orderBy(asc(school.name));

      return rows.map((row) => row.school);
    } catch (error) {
      console.error('Error fetching schools:', error);
      return [];
    }
  }

  // Shule MOJA kwa ID
  async getById(
    id: number
  ): Promise<SelectSchool | null> {
    try {
      const userId = requireOwnerUserId(this.signedInUserId);
      const result = await this.db
        .select()
        .from(school)
        .innerJoin(
          schoolMemberships,
          eq(schoolMemberships.schoolId, school.id),
        )
        .where(
          and(
            eq(school.id, id),
            eq(schoolMemberships.userId, userId),
            eq(schoolMemberships.status, 'active'),
          ),
        )
        .get();

      return result?.school ?? null;
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
      const userId = requireOwnerUserId(this.signedInUserId);

      const rows = await this.db
        .select()
        .from(school)
        .innerJoin(
          schoolMemberships,
          eq(schoolMemberships.schoolId, school.id),
        )
        .where(
          and(
            eq(schoolMemberships.userId, userId),
            eq(schoolMemberships.status, 'active'),
            like(school.name, `%${query.trim()}%`),
          ),
        )
        .orderBy(asc(school.name));

      return rows.map((row) => row.school);
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
      const userId = requireOwnerUserId(this.signedInUserId);
      const alreadyBelongsToASchool = await this.schoolAccess.currentSchoolId();
      if (alreadyBelongsToASchool != null) {
        const allowed = await this.schoolAccess.can('school.school.create');
        if (!allowed) {
          return null;
        }
      }

      const validated = SchoolProfileSchema.parse(data);
      const now = Date.now();

      const result = await this.db
        .insert(school)
        .values({
          ...validated,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const created = result[0] ?? null;
      if (!created) {
        return null;
      }

      try {
        await this.schoolAccess.prepareNewSchool(created.id, userId);
      } catch (error) {
        await this.db.delete(school).where(eq(school.id, created.id));
        throw error;
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
      const allowed = await this.schoolAccess.can('school.school.update', id);
      if (!allowed) {
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
      const allowed = await this.schoolAccess.can('school.school.delete', id);
      if (!allowed) {
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
