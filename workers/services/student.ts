import { eq, desc, asc, like } from 'drizzle-orm';
import { z } from 'zod';
import {
  students,
  type InsertStudent,
  type SelectStudent,
} from '../database/students';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

// --- Zod schemas for validation ---
const CreateStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  gender: z
    .string()
    .transform((s) => (s ? s.trim() : s))
    .refine((s) => !s || ['Male', 'Female'].includes(capitalize(s)), {
      message: 'Invalid gender',
    })
    .default('Select gender'),
  dob: z.string().optional(), // YYYY-MM-DD
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  photoUrl: z.string().optional(),
  course: z.string().optional(),
  grade: z.string().optional(),
  enrollmentDate: z.string().optional(), // YYYY-MM-DD
  classId: z.preprocess(
    (v) => (v ? Number(v) : undefined),
    z.number().optional()
  ),
  status: z.enum(['Active', 'Pending', 'Inactive']).default('Active'),
});

const UpdateStudentSchema = CreateStudentSchema.partial();

const GetStudentsSchema = z
  .object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
    sortBy: z
      .enum(['firstName', 'lastName', 'createdAt', 'updatedAt'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
    search: z.string().optional(),
  })
  .optional();

// --- TypeScript types ---
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;
export type GetStudentsInput = z.infer<typeof GetStudentsSchema>;

// --- Student service class ---
export default class StudentService {
  private db: DrizzleD1Database;

  constructor(database: DrizzleD1Database) {
    this.db = database;
  }

  async create(data: CreateStudentInput): Promise<SelectStudent | null> {
    try {
      const validated = CreateStudentSchema.parse(data);

      const result = await this.db
        .insert(students)
        .values({
          ...validated,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error creating student:', error);
      return null;
    }
  }

  async getById(id: string): Promise<SelectStudent | null> {
    try {
      const result = await this.db
        .select()
        .from(students)
        .where(eq(students.id, id))
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching student:', error);
      return null;
    }
  }

  async getAll(options: GetStudentsInput): Promise<SelectStudent[]> {
    try {
      const { limit, offset, sortBy, sortOrder, search } =
        GetStudentsSchema.parse(options) ?? {};

      const sortColumn =
        sortBy === 'firstName'
          ? students.firstName
          : sortBy === 'lastName'
          ? students.lastName
          : sortBy === 'createdAt'
          ? students.createdAt
          : students.updatedAt;

      const query = this.db.select().from(students);

      if (search) {
        query.where(
          like(students.firstName, `%${search}%`) // you could add OR lastName, email, etc.
        );
      }

      return await query
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit ?? 10)
        .offset(offset ?? 0);
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  }

  async update(
    id: string,
    data: UpdateStudentInput
  ): Promise<SelectStudent | null> {
    try {
      const validated = UpdateStudentSchema.parse(data);
      const updateValues: Partial<InsertStudent> = {
        ...validated,
        updatedAt: Date.now(),
      };

      const result = await this.db
        .update(students)
        .set(updateValues)
        .where(eq(students.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      console.error('Error updating student:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(students)
        .where(eq(students.id, id))
        .returning({ id: students.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting student:', error);
      return false;
    }
  }
}

function capitalize(s: string): string {
  if (!s) return s;
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
