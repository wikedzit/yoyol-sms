import { and, eq, like, asc } from 'drizzle-orm';
import { z } from 'zod';
import { school, type SelectSchool } from '../database/school';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';

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
  z.infer<typeof SchoolProfileSchema>;

export default class SchoolService {
  private db: DrizzleD1Database;
  private ownerUserId: number | null;

  constructor(database: DrizzleD1Database, ownerUserId: number | null) {
    this.db = database;
    this.ownerUserId = ownerUserId;
  }

  // Orodha ya shule za mmiliki
  async getAll(): Promise<SelectSchool[]> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);

      return await this.db
        .select()
        .from(school)
        .where(eq(school.ownerUserId, ownerUserId))
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
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(school)
        .where(and(eq(school.id, id), eq(school.ownerUserId, ownerUserId)))
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
      const ownerUserId = requireOwnerUserId(this.ownerUserId);

      return await this.db
        .select()
        .from(school)
        .where(
          and(
            eq(school.ownerUserId, ownerUserId),
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

  // Ongeza shule MPYA
  async create(
    data: SchoolProfileInput
  ): Promise<SelectSchool | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const validated =
        SchoolProfileSchema.parse(data);

      const result = await this.db
        .insert(school)
        .values({
          ...validated,
          ownerUserId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error(
        'Error creating school:',
        error
      );

      return null;
    }
  }

  // Badilisha shule ILIYOPO
  async update(
    id: number,
    data: SchoolProfileInput
  ): Promise<SelectSchool | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const validated =
        SchoolProfileSchema.parse(data);

      const result = await this.db
        .update(school)
        .set({
          ...validated,

          updatedAt: Date.now(),
        })
        .where(and(eq(school.id, id), eq(school.ownerUserId, ownerUserId)))
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
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .delete(school)
        .where(and(eq(school.id, id), eq(school.ownerUserId, ownerUserId)))
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
