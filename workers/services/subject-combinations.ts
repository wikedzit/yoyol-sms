import { and, eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { academicLevels, academicStreams } from '../database/academic-levels';
import { combinationSubjects, subjectCombinations } from '../database/subject-combinations';
import { subject } from '../database/subjects';
import { refusalToChangeCombination } from '../kernel/subject-combinations';
import { requireSchoolId } from '../utils/require-owner-user';

export type CombinationView = {
  id: number;
  name: string;
  status: string;
  subjects: { id: number; name: string; code: string }[];
};

export default class SubjectCombinationService {
  constructor(
    private db: AppDatabase,
    private activeSchoolId: number | null = null,
  ) {}

  async list(): Promise<CombinationView[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const combinations = await this.db
      .select()
      .from(subjectCombinations)
      .where(eq(subjectCombinations.schoolId, schoolId));
    const links = await this.db
      .select({
        combinationId: combinationSubjects.combinationId,
        subjectId: subject.id,
        name: subject.subjectName,
        code: subject.code,
      })
      .from(combinationSubjects)
      .innerJoin(subject, eq(subject.id, combinationSubjects.subjectId))
      .where(eq(combinationSubjects.schoolId, schoolId));

    return combinations.map((combination) => ({
      id: combination.id,
      name: combination.name,
      status: combination.status,
      subjects: links
        .filter((link) => link.combinationId === combination.id)
        .map((link) => ({ id: link.subjectId, name: link.name, code: link.code })),
    }));
  }

  async aLevelSubjects(): Promise<{ id: number; name: string; code: string }[]> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const level = await this.aLevel();
    if (!level) {
      return [];
    }
    const rows = await this.db
      .select({
        id: subject.id,
        name: subject.subjectName,
        code: subject.code,
        levelId: subject.levelId,
        streamLevelId: academicStreams.levelId,
      })
      .from(subject)
      .leftJoin(academicStreams, eq(academicStreams.id, subject.streamId))
      .where(eq(subject.schoolId, schoolId));
    return rows
      .filter((row) => row.levelId === level.id || row.streamLevelId === level.id)
      .map((row) => ({ id: row.id, name: row.name, code: row.code }));
  }

  async create(name: string): Promise<{ id: number } | { error: string }> {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { error: 'Enter a combination name.' };
    }
    const level = await this.aLevel();
    if (!level) {
      return { error: 'Create the A-Level before adding a combination.' };
    }
    const schoolId = requireSchoolId(this.activeSchoolId);
    try {
      const created = await this.db
        .insert(subjectCombinations)
        .values({
          schoolId,
          levelId: level.id,
          name: trimmed,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .returning({ id: subjectCombinations.id });
      const row = created[0];
      if (!row) {
        return { error: 'The combination could not be saved.' };
      }
      return { id: row.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('UNIQUE')) {
        return { error: 'A combination with this name already exists.' };
      }
      return { error: 'The combination could not be saved.' };
    }
  }

  async addSubject(combinationId: number, subjectId: number): Promise<{ ok: true } | { error: string }> {
    const combination = await this.findOwned(combinationId);
    if (!combination) {
      return { error: 'That combination was not found.' };
    }
    const levelType = await this.subjectLevelType(subjectId);
    const refusal = refusalToChangeCombination({
      status: combination.status,
      change: 'add',
      subjectLevelType: levelType,
    });
    if (refusal) {
      return { error: refusal };
    }
    const schoolId = requireSchoolId(this.activeSchoolId);
    const existing = await this.db
      .select({ subjectId: combinationSubjects.subjectId })
      .from(combinationSubjects)
      .where(and(
        eq(combinationSubjects.combinationId, combinationId),
        eq(combinationSubjects.subjectId, subjectId),
      ))
      .get();
    if (!existing) {
      await this.db.insert(combinationSubjects).values({
        combinationId,
        subjectId,
        schoolId,
      });
    }
    return { ok: true };
  }

  async removeSubject(combinationId: number, subjectId: number): Promise<{ ok: true } | { error: string }> {
    const combination = await this.findOwned(combinationId);
    if (!combination) {
      return { error: 'That combination was not found.' };
    }
    const refusal = refusalToChangeCombination({
      status: combination.status,
      change: 'remove',
      subjectLevelType: null,
    });
    if (refusal) {
      return { error: refusal };
    }
    await this.db
      .delete(combinationSubjects)
      .where(and(
        eq(combinationSubjects.combinationId, combinationId),
        eq(combinationSubjects.subjectId, subjectId),
        eq(combinationSubjects.schoolId, requireSchoolId(this.activeSchoolId)),
      ));
    return { ok: true };
  }

  async retire(combinationId: number): Promise<{ ok: true } | { error: string }> {
    const combination = await this.findOwned(combinationId);
    if (!combination) {
      return { error: 'That combination was not found.' };
    }
    await this.db
      .update(subjectCombinations)
      .set({ status: 'retired', updatedAt: Date.now() })
      .where(eq(subjectCombinations.id, combinationId));
    return { ok: true };
  }

  private async aLevel() {
    return this.db
      .select({ id: academicLevels.id })
      .from(academicLevels)
      .where(and(
        eq(academicLevels.schoolId, requireSchoolId(this.activeSchoolId)),
        eq(academicLevels.type, 'a-level'),
      ))
      .get();
  }

  private async findOwned(combinationId: number) {
    return this.db
      .select()
      .from(subjectCombinations)
      .where(and(
        eq(subjectCombinations.id, combinationId),
        eq(subjectCombinations.schoolId, requireSchoolId(this.activeSchoolId)),
      ))
      .get();
  }

  private async subjectLevelType(subjectId: number): Promise<string | null> {
    const schoolId = requireSchoolId(this.activeSchoolId);
    const row = await this.db
      .select({
        levelId: subject.levelId,
        streamLevelId: academicStreams.levelId,
      })
      .from(subject)
      .leftJoin(academicStreams, eq(academicStreams.id, subject.streamId))
      .where(and(eq(subject.id, subjectId), eq(subject.schoolId, schoolId)))
      .get();
    const levelId = row?.levelId ?? row?.streamLevelId ?? null;
    if (levelId === null) {
      return null;
    }
    const level = await this.db
      .select({ type: academicLevels.type })
      .from(academicLevels)
      .where(and(eq(academicLevels.id, levelId), eq(academicLevels.schoolId, schoolId)))
      .get();
    return level?.type ?? null;
  }
}
