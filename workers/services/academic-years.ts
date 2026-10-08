import { and, eq, gte, inArray, lte, or } from 'drizzle-orm';
import { z } from 'zod';
import {
  academicYears,
  terms,
  type InsertAcademicYear,
  type SelectAcademicYear,
  type InsertTerm,
  type SelectTerm,
} from '../database/academic-years';
import type { AppDatabase } from '../database/app-database';
import { activeYearPlan, currentTermPlan, refusalToDeleteTerm, refusalToDeleteYear, refusalToEditArchivedYear } from '../kernel/academic-calendar';
import { grades } from '../database/grades';
import { attendanceRecords } from '../database/attendance';
import { financeInvoices } from '../database/finance';
import { students } from '../database/students';
import { requireOwnerUserId, requireSchoolId } from 'workers/utils/require-owner-user';
// --- Zod Schemas for Validation ---

const isoDate = z.string().refine((v) => !isNaN(Date.parse(v)), {
  message: 'Must be a valid date',
});

const CreateAcademicYearSchema = z
  .object({
    name: z.string().min(1, 'Academic year name is required').max(50),
    startDate: isoDate,
    endDate: isoDate,
    status: z.enum(['upcoming', 'active', 'archived']).optional().default('upcoming'),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: 'Start date must be before end date',
    path: ['endDate'],
  });

const UpdateAcademicYearSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    status: z.enum(['upcoming', 'active', 'archived']).optional(),
  })
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      new Date(data.startDate) < new Date(data.endDate),
    { message: 'Start date must be before end date', path: ['endDate'] }
  );

const CreateTermSchema = z
  .object({
    academicYearId: z.number().int().positive(),
    name: z.string().min(1, 'Term name is required').max(50),
    termNumber: z.number().int().min(1).max(12),
    startDate: isoDate,
    endDate: isoDate,
    isCurrent: z.boolean().optional().default(false),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: 'Start date must be before end date',
    path: ['endDate'],
  });

const UpdateTermSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    termNumber: z.number().int().min(1).max(12).optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    isCurrent: z.boolean().optional(),
  })
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      new Date(data.startDate) < new Date(data.endDate),
    { message: 'Start date must be before end date', path: ['endDate'] }
  );

// --- TypeScript types ---
export type CreateAcademicYearInput = z.infer<typeof CreateAcademicYearSchema>;
export type UpdateAcademicYearInput = z.infer<typeof UpdateAcademicYearSchema>;
export type CreateTermInput = z.infer<typeof CreateTermSchema>;
export type UpdateTermInput = z.infer<typeof UpdateTermSchema>;

// --- Date-matching helpers (dates are stored as 'YYYY-MM-DD', which sorts
// and compares correctly as plain strings, so no Date parsing is needed) ---

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function findYearForDate(
  years: SelectAcademicYear[],
  date: string
): SelectAcademicYear | null {
  return years.find((y) => y.startDate <= date && date <= y.endDate) || null;
}

function findTermForDate(termList: SelectTerm[], date: string): SelectTerm | null {
  return termList.find((t) => t.startDate <= date && date <= t.endDate) || null;
}

// The result of asking "what's the current term right now?" — distinguishes
// a real holiday gap between terms from there being no data at all yet.
export type CurrentTermStatus =
  | { term: SelectTerm; status: 'in_term' }
  | { term: null; status: 'break' }
  | { term: null; status: 'unset' };

export default class AcademicYearService {
  private db: AppDatabase;
  private ownerUserId: number | null;
  private activeSchoolId: number | null;
  private publishTermStarted: ((input: {
    schoolId: number;
    termId: number;
    academicYearId: number;
  }) => Promise<void>) | null;

  constructor(
    database: AppDatabase,
    ownerUserId: number | null,
    activeSchoolId: number | null = null,
    publishTermStarted: ((input: {
      schoolId: number;
      termId: number;
      academicYearId: number;
    }) => Promise<void>) | null = null,
  ) {
    this.db = database;
    this.ownerUserId = ownerUserId;
    this.activeSchoolId = activeSchoolId;
    this.publishTermStarted = publishTermStarted;
  }

  // ==================== ACADEMIC YEAR OPERATIONS ====================

  async createYear(data: CreateAcademicYearInput): Promise<SelectAcademicYear | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const validated = CreateAcademicYearSchema.parse(data);
      const result = await this.db
        .insert(academicYears)
        .values({
          ...validated,
          schoolId: requireSchoolId(this.activeSchoolId),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      const created = result[0] || null;
      // If it was created directly as active, enforce the single-active-year rule.
      if (created && created.status === 'active') {
        await this.setActiveYear(created.id);
        return (await this.getYearById(created.id)) ?? created;
      }
      return created;
    } catch (error) {
      console.error('Error creating academic year:', error);
      return null;
    }
  }

  async getYearById(id: number): Promise<SelectAcademicYear | null> {
    try {
      const result = await this.db
        .select()
        .from(academicYears)
        .where(
          and(
            eq(academicYears.id, id),
            eq(academicYears.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching academic year:', error);
      return null;
    }
  }

  async getAllYears(): Promise<SelectAcademicYear[]> {
    try {
      return await this.db
        .select()
        .from(academicYears)
        .where(eq(academicYears.schoolId, requireSchoolId(this.activeSchoolId)))
        .orderBy(academicYears.startDate);
    } catch (error) {
      console.error('Error fetching academic years:', error);
      return [];
    }
  }

  /**
   * Returns the active academic year. Before returning, checks whether
   * today's date actually falls inside a different year's date range, and
   * if so, silently switches to that year (auto-archiving the old one) —
   * so nobody has to click "Set Active" by hand once dates are entered.
   *
   * If today falls in a gap between two years (e.g. the old year ended and
   * the new one hasn't officially started yet), the previously active year
   * is left active rather than clearing it, so the rest of the system
   * always has an active year to work with.
   */
  async getActiveYear(): Promise<SelectAcademicYear | null> {
    try {
      const years = await this.getAllYears();
      const today = todayISO();
      const todaysYear = findYearForDate(years, today);
      const storedActive = years.find((y) => y.status === 'active') || null;

      if (todaysYear && todaysYear.id !== storedActive?.id) {
        return await this.setActiveYear(todaysYear.id);
      }

      return storedActive;
    } catch (error) {
      console.error('Error fetching active academic year:', error);
      return null;
    }
  }

  async updateYear(
    id: number,
    data: UpdateAcademicYearInput
  ): Promise<SelectAcademicYear | null> {
    try {
      const validated = UpdateAcademicYearSchema.parse(data);
      const current = await this.getYearById(id);
      if (!current) return null;
      const archivedRefusal = refusalToEditArchivedYear(current.status, validated);
      if (archivedRefusal) {
        throw new Error(archivedRefusal);
      }

      // Route through setActiveYear so the single-active-year rule is enforced,
      // rather than allowing a bare status flip to create two active years.
      if (validated.status === 'active') {
        const { status, ...rest } = validated;
        if (Object.keys(rest).length > 0) {
          await this.db
            .update(academicYears)
            .set({ ...rest, updatedAt: Date.now() })
            .where(
              and(
                eq(academicYears.id, id),
                eq(academicYears.schoolId, requireSchoolId(this.activeSchoolId)),
              ),
            );
        }
        await this.setActiveYear(id);
        return this.getYearById(id);
      }

      const result = await this.db
        .update(academicYears)
        .set({
          ...validated,
          updatedAt: Date.now(),
        })
        .where(
          and(
            eq(academicYears.id, id),
            eq(academicYears.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .returning();
      return result[0] || null;
    } catch (error) {
      if (error instanceof Error && error.message === 'An archived year keeps its name and dates.') {
        throw error;
      }
      console.error('Error updating academic year:', error);
      return null;
    }
  }

  /**
   * Marks the given year as active and archives whichever year was
   * previously active. Only one academic year may be active at a time.
   */
  async setActiveYear(id: number): Promise<SelectAcademicYear | null> {
    try {
      requireOwnerUserId(this.ownerUserId);
      const target = await this.getYearById(id);
      if (!target) return null;

      const years = await this.getAllYears();
      const plan = activeYearPlan(years.map((year) => ({ id: year.id, status: year.status })), id);
      if (plan.archiveIds.length > 0) {
        await this.db
          .update(academicYears)
          .set({ status: 'archived', updatedAt: Date.now() })
          .where(
            and(
              eq(academicYears.schoolId, requireSchoolId(this.activeSchoolId)),
              inArray(academicYears.id, plan.archiveIds),
            ),
          );
      }

      const result = await this.db
        .update(academicYears)
        .set({ status: 'active', updatedAt: Date.now() })
        .where(
          and(
            eq(academicYears.id, id),
            eq(academicYears.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        )
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error setting active academic year:', error);
      return null;
    }
  }

  async deleteYear(id: number): Promise<boolean> {
    try {
      const year = await this.getYearById(id);
      if (!year) return false;
      const schoolId = requireSchoolId(this.activeSchoolId);
      const refusal = refusalToDeleteYear({
        enrolmentCount: await this.matchingRowCount(
          this.db
            .select({ id: students.id })
            .from(students)
            .where(and(
              eq(students.schoolId, schoolId),
              or(
                eq(students.academicYearId, year.id),
                and(
                  gte(students.enrollmentDate, year.startDate),
                  lte(students.enrollmentDate, year.endDate),
                ),
              ),
            ))
            .limit(1),
        ),
        resultCount: await this.matchingRowCount(
          this.db
            .select({ id: grades.id })
            .from(grades)
            .innerJoin(terms, eq(grades.termId, terms.id))
            .where(and(
              eq(grades.schoolId, schoolId),
              eq(terms.academicYearId, year.id),
            ))
            .limit(1),
        ),
        invoiceCount: await this.matchingRowCount(
          this.db
            .select({ id: financeInvoices.id })
            .from(financeInvoices)
            .where(and(
              eq(financeInvoices.schoolId, schoolId),
              eq(financeInvoices.academicYearId, year.id),
            ))
            .limit(1),
        ),
      });
      if (refusal) {
        throw new Error(refusal);
      }

      const result = await this.db
        .delete(academicYears)
        .where(
          and(
            eq(academicYears.id, id),
            eq(academicYears.schoolId, schoolId),
          ),
        )
        .returning({ id: academicYears.id });
      return result.length > 0;
    } catch (error) {
      if (error instanceof Error && error.message === 'This year still has enrolments, results, or invoices.') {
        throw error;
      }
      console.error('Error deleting academic year:', error);
      return false;
    }
  }

  // ==================== TERM OPERATIONS ====================

  async createTerm(data: CreateTermInput): Promise<SelectTerm | { error: string } | null> {
    try {
      const validated = CreateTermSchema.parse(data);

      const year = await this.getYearById(validated.academicYearId);
      if (!year) return { error: 'Academic year not found' };

      if (
        new Date(validated.startDate) < new Date(year.startDate) ||
        new Date(validated.endDate) > new Date(year.endDate)
      ) {
        return { error: "Term dates must fall within the academic year's dates" };
      }

      const result = await this.db
        .insert(terms)
        .values({
          ...validated,
          schoolId: year.schoolId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning();

      const created = result[0] || null;
      if (created && validated.isCurrent) {
        await this.setCurrentTerm(created.id);
        return (await this.getTermById(created.id)) ?? created;
      }
      return created;
    } catch (error) {
      console.error('Error creating term:', error);
      return null;
    }
  }

  async getTermById(id: number): Promise<SelectTerm | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select({ term: terms })
        .from(terms)
        .innerJoin(academicYears, eq(terms.academicYearId, academicYears.id))
        .where(
          and(eq(terms.id, id), eq(academicYears.schoolId, requireSchoolId(this.activeSchoolId))),
        )
        .get();
      return result?.term || null;
    } catch (error) {
      console.error('Error fetching term:', error);
      return null;
    }
  }

  async getTermsByYearId(academicYearId: number): Promise<SelectTerm[]> {
    try {
      const year = await this.getYearById(academicYearId);
      if (!year) return [];

      return await this.db
        .select()
        .from(terms)
        .where(eq(terms.academicYearId, academicYearId))
        .orderBy(terms.termNumber);
    } catch (error) {
      console.error('Error fetching terms for academic year:', error);
      return [];
    }
  }

  /**
   * Returns the current term, self-healing as it goes: if today's date
   * actually falls inside a different term than whichever one is flagged
   * current, it silently switches to the correct one. If today falls in a
   * gap between two terms (a holiday break), any stale "current" flag is
   * cleared and status: 'break' is returned instead of guessing.
   */
  async getCurrentTerm(): Promise<CurrentTermStatus> {
    try {
      const activeYear = await this.getActiveYear();
      if (!activeYear) return { term: null, status: 'unset' };

      const yearTerms = await this.getTermsByYearId(activeYear.id);
      if (yearTerms.length === 0) return { term: null, status: 'unset' };

      const today = todayISO();
      const todaysTerm = findTermForDate(yearTerms, today);
      const storedCurrent = yearTerms.find((t) => t.isCurrent) || null;

      if (todaysTerm) {
        if (todaysTerm.id !== storedCurrent?.id) {
          const updated = await this.setCurrentTerm(todaysTerm.id);
          if (updated && !('error' in updated)) {
            return { term: updated, status: 'in_term' };
          }
        }
        return { term: todaysTerm, status: 'in_term' };
      }

      // Today doesn't fall inside any term for the active year — a break.
      if (storedCurrent) {
        const ownedYearIds = (await this.getAllYears()).map((year) => year.id);
        if (ownedYearIds.length > 0) {
          await this.db
            .update(terms)
            .set({ isCurrent: false, updatedAt: Date.now() })
            .where(
              and(
                eq(terms.isCurrent, true),
                inArray(terms.academicYearId, ownedYearIds),
              ),
            );
        }
      }
      return { term: null, status: 'break' };
    } catch (error) {
      console.error('Error resolving current term:', error);
      return { term: null, status: 'unset' };
    }
  }

  async updateTerm(
    id: number,
    data: UpdateTermInput
  ): Promise<SelectTerm | { error: string } | null> {
    try {
      const validated = UpdateTermSchema.parse(data);

      const existing = await this.getTermById(id);
      if (!existing) return { error: 'Term not found' };

      if (validated.startDate || validated.endDate) {
        const year = await this.getYearById(existing.academicYearId);
        const start = validated.startDate ?? existing.startDate;
        const end = validated.endDate ?? existing.endDate;
        if (
          year &&
          (new Date(start) < new Date(year.startDate) ||
            new Date(end) > new Date(year.endDate))
        ) {
          return { error: "Term dates must fall within the academic year's dates" };
        }
      }

      if (validated.isCurrent) {
        const { isCurrent, ...rest } = validated;
        if (Object.keys(rest).length > 0) {
          await this.db
            .update(terms)
            .set({ ...rest, updatedAt: Date.now() })
            .where(eq(terms.id, id));
        }
        return this.setCurrentTerm(id);
      }

      const result = await this.db
        .update(terms)
        .set({
          ...validated,
          updatedAt: Date.now(),
        })
        .where(eq(terms.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error updating term:', error);
      return null;
    }
  }

  /**
   * Marks the given term as current, clearing any other term's current
   * flag. Refuses if the term's academic year is not the active year.
   */
  async setCurrentTerm(id: number): Promise<SelectTerm | { error: string } | null> {
    try {
      const target = await this.getTermById(id);
      if (!target) return { error: 'Term not found' };

      const year = await this.getYearById(target.academicYearId);
      if (!year || year.status !== 'active') {
        return { error: 'Only a term within the active academic year can be marked current' };
      }

      const ownedYearIds = (await this.getAllYears()).map((year) => year.id);
      const schoolTerms = ownedYearIds.length === 0
        ? []
        : await this.db
          .select({ id: terms.id, isCurrent: terms.isCurrent })
          .from(terms)
          .where(inArray(terms.academicYearId, ownedYearIds));
      const plan = currentTermPlan(schoolTerms, id);
      if (plan.clearIds.length > 0) {
        await this.db
          .update(terms)
          .set({ isCurrent: false, updatedAt: Date.now() })
          .where(inArray(terms.id, plan.clearIds));
      }

      const result = await this.db
        .update(terms)
        .set({ isCurrent: true, updatedAt: Date.now() })
        .where(eq(terms.id, id))
        .returning();
      const updated = result[0] || null;
      if (updated && !target.isCurrent && this.publishTermStarted) {
        await this.publishTermStarted({
          schoolId: requireSchoolId(this.activeSchoolId),
          termId: updated.id,
          academicYearId: updated.academicYearId,
        });
      }
      return updated;
    } catch (error) {
      console.error('Error setting current term:', error);
      return null;
    }
  }

  async deleteTerm(id: number): Promise<boolean> {
    try {
      const existing = await this.getTermById(id);
      if (!existing) return false;
      const schoolId = requireSchoolId(this.activeSchoolId);
      const refusal = refusalToDeleteTerm({
        resultCount: await this.matchingRowCount(
          this.db
            .select({ id: grades.id })
            .from(grades)
            .where(and(eq(grades.termId, id), eq(grades.schoolId, schoolId)))
            .limit(1),
        ),
        attendanceCount: await this.matchingRowCount(
          this.db
            .select({ id: attendanceRecords.id })
            .from(attendanceRecords)
            .where(and(eq(attendanceRecords.termId, id), eq(attendanceRecords.schoolId, schoolId)))
            .limit(1),
        ),
      });
      if (refusal) {
        throw new Error(refusal);
      }

      const result = await this.db
        .delete(terms)
        .where(eq(terms.id, id))
        .returning({ id: terms.id });
      return result.length > 0;
    } catch (error) {
      if (error instanceof Error && error.message === 'This term still has results or attendance.') {
        throw error;
      }
      console.error('Error deleting term:', error);
      return false;
    }
  }

  // ==================== AGGREGATE QUERIES ====================

  async getYearWithTerms(id: number): Promise<{
    year: SelectAcademicYear | null;
    terms: SelectTerm[];
  }> {
    const year = await this.getYearById(id);
    const yearTerms = year ? await this.getTermsByYearId(id) : [];
    return { year, terms: yearTerms };
  }

  async getAllYearsWithTerms(): Promise<
    Array<SelectAcademicYear & { terms: SelectTerm[] }>
  > {
    try {
      const years = await this.getAllYears();
      return await Promise.all(
        years.map(async (year) => ({
          ...year,
          terms: await this.getTermsByYearId(year.id),
        }))
      );
    } catch (error) {
      console.error('Error fetching years with terms:', error);
      return [];
    }
  }

  private async matchingRowCount(query: PromiseLike<readonly unknown[]>): Promise<number> {
    const rows = await query;
    return rows.length;
  }
}
