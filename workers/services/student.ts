import { and, eq, desc, asc, like, ne } from 'drizzle-orm';
import { z } from 'zod';
import {
  students,
  type InsertStudent,
  type SelectStudent,
} from '../database/students';
import { campus } from '../database/campuses';
import { school } from '../database/school';
import type { DatabaseAdapter } from '../database/adapter';
import { academicYears } from '../database/academic-years';
import { studentEnrolments } from '../database/student-enrolments';
import { financeInvoices } from '../database/finance';
import { results } from '../database/assessment';
import { refusalToEnrolTwice } from '../kernel/student-enrolments';
import { extensionSettings } from '../database/extension-registry';
import {
  admissionYear,
  defaultAdmissionNumberFormat,
  nextAdmissionNumber,
  refusalToChangeAdmissionNumber,
  refusalToReuseAdmissionNumber,
} from '../kernel/admission-numbers';
import { outboxInsert, sqliteOutboxInsert } from '../kernel/event-catalogue';
import { schoolClassroom } from '../kernel/school-classroom';
import { requireOwnerUserId, requireSchoolId } from 'workers/utils/require-owner-user';
// --- Zod schemas for validation ---
const CreateStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional(),
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
  // Legacy: old university-style class reference
  classId: z.preprocess(
    (v) => (v ? Number(v) : undefined),
    z.number().optional()
  ),
  // New: school-style formClass reference (O-Level/A-Level structure)
  formClassId: z.preprocess(
    (v) => (v ? Number(v) : undefined),
    z.number().optional()
  ),
  // Which school this student belongs to — OPTIONAL, since students added
  // via the O-Level/A-Level formClass flow have no school relationship
  schoolId: z.preprocess(
    (v) => (v ? Number(v) : undefined),
    z.number().optional()
  ),
  admissionNumber: z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return undefined;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().max(64).optional(),
  ),
  campusId: z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      const campusId = Number(value);
      return Number.isFinite(campusId) ? campusId : undefined;
    },
    z.number().int().positive().optional(),
  ),
  status: z.enum(['Active', 'Pending', 'Inactive', 'Suspended']).default('Active'),
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
  constructor(
    private adapter: DatabaseAdapter,
    private ownerUserId: number | null,
    private activeSchoolId: number | null = null,
    private dispatchOutbox: () => Promise<void> = async () => {},
  ) {}

  private get db() {
    return this.adapter.db;
  }

  // ------------------------------------------------
  // Create student
  // ------------------------------------------------

  async create(
    data: CreateStudentInput,
  ): Promise<SelectStudent | null> {
    try {
      const ownerUserId =
        requireOwnerUserId(
          this.ownerUserId,
        );

      const validated =
        CreateStudentSchema.parse(data);

      // Verify that the selected campus belongs
      // to a school owned by the current user (if specified).
      if (validated.campusId) {
        const ownedCampus =
          await this.db
            .select({
              id: campus.id,
            })
            .from(campus)
            .innerJoin(
              school,
              eq(
                campus.schoolId,
                school.id,
              ),
            )
            .where(
              and(
                eq(
                  campus.id,
                  validated.campusId,
                ),
                eq(school.id, requireSchoolId(this.activeSchoolId)),
              ),
            )
            .get();

        if (!ownedCampus) {
          throw new Error(
            'Selected campus was not found.',
          );
        }
      }

      if (validated.schoolId) {
        const ownedSchool = await this.db
          .select({ id: school.id })
          .from(school)
          .where(
            and(
              eq(school.id, validated.schoolId),
              eq(school.id, requireSchoolId(this.activeSchoolId)),
            ),
          )
          .get();

        if (!ownedSchool) {
          throw new Error('Selected school was not found.');
        }
      }

      const schoolId = validated.schoolId ?? requireSchoolId(this.activeSchoolId);
      if (validated.admissionNumber) {
        const duplicate = refusalToReuseAdmissionNumber(
          (await this.findByAdmissionNumber(validated.admissionNumber)) !== null,
        );
        if (duplicate) {
          throw new Error(duplicate);
        }
      } else {
        validated.admissionNumber = await this.generatedAdmissionNumber(
          schoolId,
          validated.enrollmentDate,
        );
      }

      const now = Date.now();
      const classroom = schoolClassroom({
        formClassId: validated.formClassId,
        universityClassId: validated.classId,
      });
      const activeYear = await this.db
        .select({ id: academicYears.id })
        .from(academicYears)
        .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.status, 'active')))
        .get();
      const studentFields = { ...validated };
      delete studentFields.classId;
      const values = {
        ...studentFields,
        formClassId: classroom.formClassId ?? undefined,
        academicYearId: activeYear?.id,
        schoolId,
        createdAt: now,
        updatedAt: now,
      };

      if (validated.formClassId && activeYear) {
        const compiled = this.db.insert(students).values(values).returning().toSQL();
        const created = await this.adapter.insertWithOutbox({
          change: { sql: compiled.sql, params: compiled.params },
          map: studentFromRow,
          outbox: (row) => outboxInsert({
            schoolId,
            name: 'students.student.enrolled',
            payload: {
              studentId: row.id,
              formClassId: validated.formClassId,
              academicYearId: activeYear.id,
            },
            now,
          }),
          sqliteOutbox: sqliteOutboxInsert({
            schoolId,
            name: 'students.student.enrolled',
            payload: { formClassId: validated.formClassId, academicYearId: activeYear.id },
            idField: 'studentId',
            now,
          }),
        });
        await this.dispatchOutbox();
        if (created) {
          await this.recordYearEnrolment(schoolId, created.id, activeYear.id, classroom.formClassId ?? null);
        }
        return created;
      }

      const result = await this.db.insert(students).values(values).returning();
      return result[0] || null;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          'This admission number is already in use.'
      ) {
        throw error;
      }

      console.error(
        'Error creating student:',
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Failed to add student.';

      throw new Error(message);
    }
  }

  async findByAdmissionNumber(
    admissionNumber: string,
  ): Promise<SelectStudent | null> {
    const ownerUserId = requireOwnerUserId(this.ownerUserId);
    const result = await this.db
      .select()
      .from(students)
      .where(
        and(
          eq(students.schoolId, requireSchoolId(this.activeSchoolId)),
          eq(students.admissionNumber, admissionNumber),
        ),
      )
      .get();

    return result ?? null;
  }

  async getById(id: string): Promise<SelectStudent | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(students)
        .where(
          and(eq(students.id, Number(id)), eq(students.schoolId, requireSchoolId(this.activeSchoolId))),
        )
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching student:', error);
      return null;
    }
  }

  async getByEmail(email: string): Promise<SelectStudent | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(students)
        .where(
          and(eq(students.email, email), eq(students.schoolId, requireSchoolId(this.activeSchoolId))),
        )
        .get();
      return result || null;
    } catch (error) {
      console.error('Error fetching student by email:', error);
      return null;
    }
  }

  async getAll(options: GetStudentsInput): Promise<SelectStudent[]> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
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

      const filters = [
        eq(students.schoolId, requireSchoolId(this.activeSchoolId)),
        ne(students.status, 'Archived'),
      ];
      if (search) {
        filters.push(like(students.firstName, `%${search}%`));
      }

      return await this.db
        .select()
        .from(students)
        .where(and(...filters))
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
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const validated = UpdateStudentSchema.parse(data);
      if (validated.admissionNumber) {
        await this.refuseAdmissionNumberChange(id, validated.admissionNumber);
      }
      const studentFields = { ...validated };
      delete studentFields.classId;
      const updateValues: Partial<InsertStudent> = {
        ...studentFields,
        updatedAt: Date.now(),
      };

      const result = await this.db
        .update(students)
        .set(updateValues)
        .where(
          and(eq(students.id, Number(id)), eq(students.schoolId, requireSchoolId(this.activeSchoolId))),
        )
        .returning();

      return result[0] || null;
    } catch (error) {
      if (error instanceof Error && (
        error.message === 'This admission number is already in use.'
        || error.message === 'This admission number is already on a report or invoice.'
      )) {
        throw error;
      }
      console.error('Error updating student:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .update(students)
        .set({ status: 'Archived', updatedAt: Date.now() })
        .where(
          and(eq(students.id, Number(id)), eq(students.schoolId, requireSchoolId(this.activeSchoolId))),
        )
        .returning({ id: students.id });
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting student:', error);
      return false;
    }
  }

  /**
   * Get students by formClassId (school structure: O-Level/A-Level)
   */
  async getByFormClassId(formClassId: number): Promise<SelectStudent[]> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      return await this.db
        .select()
        .from(students)
        .where(
          and(
            eq(students.formClassId, formClassId),
            eq(students.schoolId, requireSchoolId(this.activeSchoolId)),
            ne(students.status, 'Archived'),
          ),
        )
        .orderBy(asc(students.firstName), asc(students.lastName));
    } catch (error) {
      console.error('Error fetching students by formClassId:', error);
      return [];
    }
  }

  /**
   * Count students in a formClass
   */
  async countByFormClassId(formClassId: number): Promise<number> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(students)
        .where(
          and(
            eq(students.formClassId, formClassId),
            eq(students.schoolId, requireSchoolId(this.activeSchoolId)),
            ne(students.status, 'Archived'),
          ),
        );
      return result.length;
    } catch (error) {
      console.error('Error counting students by formClassId:', error);
      return 0;
    }
  }

  /**
   * Count students owned by the signed-in user
   */
  async countAll(): Promise<number> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(students)
        .where(
          and(eq(students.schoolId, requireSchoolId(this.activeSchoolId)), ne(students.status, 'Archived')),
        );
      return result.length;
    } catch (error) {
      console.error('Error counting students:', error);
      return 0;
    }
  }

  /**
   * Wanafunzi wa shule maalum (kwa School Detail page)
   */
  async getBySchoolId(schoolId: number): Promise<SelectStudent[]> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      return await this.db
        .select()
        .from(students)
        .where(
          and(
            eq(students.schoolId, schoolId),
            eq(students.schoolId, requireSchoolId(this.activeSchoolId)),
            ne(students.status, 'Archived'),
          ),
        )
        .orderBy(asc(students.firstName), asc(students.lastName));
    } catch (error) {
      console.error('Error fetching students by schoolId:', error);
      return [];
    }
  }

  /**
   * Idadi ya wanafunzi wa shule maalum (kwa Stats card kwenye School Detail)
   */
  async countBySchoolId(schoolId: number): Promise<number> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const result = await this.db
        .select()
        .from(students)
        .where(
          and(
            eq(students.schoolId, schoolId),
            eq(students.schoolId, requireSchoolId(this.activeSchoolId)),
          ),
        );
      return result.length;
    } catch (error) {
      console.error('Error counting students by schoolId:', error);
      return 0;
    }
  }

  private async recordYearEnrolment(
    schoolId: number,
    studentId: number,
    academicYearId: number,
    formClassId: number | null,
  ): Promise<void> {
    const existing = await this.db
      .select({
        studentId: studentEnrolments.studentId,
        academicYearId: studentEnrolments.academicYearId,
        formClassId: studentEnrolments.formClassId,
        status: studentEnrolments.status,
      })
      .from(studentEnrolments)
      .where(and(
        eq(studentEnrolments.studentId, studentId),
        eq(studentEnrolments.academicYearId, academicYearId),
      ))
      .get();
    const refusal = refusalToEnrolTwice(existing
      ? { ...existing, status: existing.status === 'left' || existing.status === 'transferred' ? existing.status : 'enrolled' }
      : null);
    if (refusal) {
      throw new Error(refusal);
    }
    const now = Date.now();
    await this.db.insert(studentEnrolments).values({
      schoolId,
      studentId,
      academicYearId,
      formClassId,
      status: 'enrolled',
      createdAt: now,
      updatedAt: now,
    });
  }

  private async generatedAdmissionNumber(
    schoolId: number,
    enrollmentDate: string | undefined,
  ): Promise<string> {
    const stored = await this.db
      .select({ value: extensionSettings.settingValue })
      .from(extensionSettings)
      .where(and(
        eq(extensionSettings.schoolId, schoolId),
        eq(extensionSettings.extensionKey, 'students'),
        eq(extensionSettings.settingKey, 'admissionNumberFormat'),
      ))
      .get();
    const taken = await this.db
      .select({ admissionNumber: students.admissionNumber })
      .from(students)
      .where(eq(students.schoolId, schoolId));

    return nextAdmissionNumber({
      format: stored?.value || defaultAdmissionNumberFormat,
      year: admissionYear(enrollmentDate, new Date()),
      taken: taken
        .map((row) => row.admissionNumber)
        .filter((value): value is string => Boolean(value)),
    });
  }

  private async refuseAdmissionNumberChange(id: string, admissionNumber: string): Promise<void> {
    const current = await this.getById(id);
    if (!current || current.admissionNumber === admissionNumber) {
      return;
    }

    const invoice = await this.db
      .select({ id: financeInvoices.id })
      .from(financeInvoices)
      .where(and(
        eq(financeInvoices.studentId, Number(id)),
        current.schoolId == null ? eq(financeInvoices.studentId, Number(id)) : eq(financeInvoices.schoolId, current.schoolId),
      ))
      .limit(1)
      .get();
    const report = await this.db
      .select({ id: results.id })
      .from(results)
      .where(eq(results.studentId, Number(id)))
      .limit(1)
      .get();
    const blocked = refusalToChangeAdmissionNumber({
      reportCount: report ? 1 : 0,
      invoiceCount: invoice ? 1 : 0,
    });
    if (blocked) {
      throw new Error(blocked);
    }

    const existing = await this.findByAdmissionNumber(admissionNumber);
    const duplicate = refusalToReuseAdmissionNumber(existing !== null && existing.id !== Number(id));
    if (duplicate) {
      throw new Error(duplicate);
    }
  }
}

function studentFromRow(raw: Record<string, unknown>): SelectStudent {
  return {
    id: numberValue(raw.id),
    firstName: textValue(raw.first_name),
    middleName: textOrNull(raw.middle_name),
    lastName: textValue(raw.last_name),
    gender: textValue(raw.gender),
    dob: textOrNull(raw.dob),
    email: textOrNull(raw.email),
    phone: textOrNull(raw.phone),
    address: textOrNull(raw.address),
    guardianName: textOrNull(raw.guardian_name),
    guardianPhone: textOrNull(raw.guardian_phone),
    photoUrl: textOrNull(raw.photo_url),
    course: textOrNull(raw.course),
    grade: textOrNull(raw.grade),
    enrollmentDate: textOrNull(raw.enrollment_date),
    status: textValue(raw.status),
    createdAt: numberValue(raw.created_at),
    updatedAt: numberValue(raw.updated_at),
    formClassId: numberOrNull(raw.form_class_id),
    schoolId: numberOrNull(raw.school_id),
    admissionNumber: textOrNull(raw.admission_number),
    academicYearId: numberOrNull(raw.academic_year_id),
    campusId: numberOrNull(raw.campus_id),
  };
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function numberValue(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'number' ? value : Number(value);
}

function capitalize(s: string): string {
  if (!s) return s;
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}