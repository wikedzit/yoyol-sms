import { and, eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { grades } from '../database/grades';
import { students } from '../database/students';
import { erasedIdentity, personExport, type PersonExport } from '../kernel/person-data';
import { requireSchoolId } from '../utils/require-owner-user';
import type AuditService from './audit';

export default class PersonDataService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null,
    private actorUserId: number | null,
    private audit: AuditService,
  ) {}

  async exportStudent(studentId: number): Promise<PersonExport> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const student = await this.findStudent(schoolId, studentId);
    const gradeRows = await this.db
      .select({
        id: grades.id,
        subjectId: grades.subjectId,
        score: grades.score,
        grade: grades.grade,
        status: grades.status,
      })
      .from(grades)
      .where(and(eq(grades.schoolId, schoolId), eq(grades.studentId, studentId)));

    return personExport({
      exportedAt: new Date().toISOString(),
      schoolId,
      student,
      grades: gradeRows,
    });
  }

  async eraseStudent(studentId: number, confirmed: boolean): Promise<void> {
    if (!confirmed) {
      throw new Error('Confirm before removing personal details.');
    }
    const schoolId = requireSchoolId(this.activeSchoolId);
    await this.findStudent(schoolId, studentId);
    await this.db
      .update(students)
      .set({ ...erasedIdentity(), updatedAt: Date.now() })
      .where(and(eq(students.schoolId, schoolId), eq(students.id, studentId)));
    await this.audit.append({
      action: 'person.erase',
      schoolId,
      userId: this.actorUserId,
      extensionKey: 'students',
      target: String(studentId),
    });
  }

  private async findStudent(schoolId: number, studentId: number) {
    const student = await this.db
      .select({
        id: students.id,
        firstName: students.firstName,
        middleName: students.middleName,
        lastName: students.lastName,
        admissionNumber: students.admissionNumber,
        gender: students.gender,
        dob: students.dob,
        email: students.email,
        phone: students.phone,
        address: students.address,
        guardianName: students.guardianName,
        guardianPhone: students.guardianPhone,
        photoUrl: students.photoUrl,
        status: students.status,
      })
      .from(students)
      .where(and(eq(students.schoolId, schoolId), eq(students.id, studentId)))
      .get();
    if (!student) {
      throw new Error('That student was not found.');
    }
    return student;
  }
}
