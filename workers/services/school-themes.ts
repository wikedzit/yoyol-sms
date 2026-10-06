import { and, desc, eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  buildThemeCss,
  defaultThemeKey,
  parseThemePackage,
  type ThemeDocument,
} from '../../extensions/themes/src/theme-document';
import { school } from '../database/school';
import {
  schoolThemes,
  type SelectSchoolTheme,
} from '../database/school-themes';
import { requireOwnerUserId } from 'workers/utils/require-owner-user';

export type ListedSchoolTheme = {
  key: string;
  nameEn: string;
  nameSw: string;
  isActive: boolean;
  isBundled: boolean;
};

const bundledTheme: ListedSchoolTheme = {
  key: defaultThemeKey,
  nameEn: 'YOYOL',
  nameSw: 'YOYOL',
  isActive: true,
  isBundled: true,
};

export default class SchoolThemeService {
  constructor(
    private db: DrizzleD1Database,
    private ownerUserId: number | null,
  ) {}

  async listForSchool(schoolId: number): Promise<ListedSchoolTheme[]> {
    await this.requireOwnedSchool(schoolId);

    try {
      const uploaded = await this.selectForSchool(schoolId);
      const customIsActive = uploaded.some((theme) => theme.isActive);

      return [
        { ...bundledTheme, isActive: !customIsActive },
        ...uploaded.map(toListedTheme),
      ];
    } catch (error) {
      console.error('Unable to list site themes:', error);
      return [{ ...bundledTheme }];
    }
  }

  async savePackage(schoolId: number, rawText: string): Promise<void> {
    const ownerUserId = await this.requireOwnedSchool(schoolId);
    const document = parseThemePackage(rawText);

    if (document.key === defaultThemeKey) {
      throw new Error('The YOYOL theme is built in and cannot be replaced.');
    }

    const now = Date.now();
    const existing = await this.findByKey(schoolId, document.key);

    if (existing) {
      await this.db
        .update(schoolThemes)
        .set({
          nameEn: document.name.en,
          nameSw: document.name.sw,
          tokensJson: JSON.stringify(document),
          updatedAt: now,
        })
        .where(eq(schoolThemes.id, existing.id));
      return;
    }

    await this.db.insert(schoolThemes).values({
      schoolId,
      ownerUserId,
      themeKey: document.key,
      nameEn: document.name.en,
      nameSw: document.name.sw,
      tokensJson: JSON.stringify(document),
      isActive: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  async activate(schoolId: number, themeKey: string): Promise<void> {
    await this.requireOwnedSchool(schoolId);
    const now = Date.now();

    await this.db
      .update(schoolThemes)
      .set({ isActive: false, updatedAt: now })
      .where(eq(schoolThemes.schoolId, schoolId));

    if (themeKey === defaultThemeKey) {
      return;
    }

    const selected = await this.findByKey(schoolId, themeKey);
    if (!selected) {
      throw new Error('That theme is not uploaded for this school.');
    }

    await this.db
      .update(schoolThemes)
      .set({ isActive: true, updatedAt: now })
      .where(eq(schoolThemes.id, selected.id));
  }

  // Null means "keep the colours already in the stylesheet".
  async getActiveCss(): Promise<string | null> {
    try {
      const ownerUserId = requireOwnerUserId(this.ownerUserId);
      const active = await this.db
        .select({ tokensJson: schoolThemes.tokensJson })
        .from(schoolThemes)
        .innerJoin(school, eq(schoolThemes.schoolId, school.id))
        .where(
          and(
            eq(school.ownerUserId, ownerUserId),
            eq(schoolThemes.isActive, true),
          ),
        )
        .orderBy(desc(schoolThemes.updatedAt))
        .limit(1)
        .get();

      if (!active) {
        return null;
      }

      const document = parseThemePackage(active.tokensJson);
      return buildThemeCss(document);
    } catch (error) {
      console.error('Unable to load the active site theme:', error);
      return null;
    }
  }

  private async requireOwnedSchool(schoolId: number): Promise<number> {
    const ownerUserId = requireOwnerUserId(this.ownerUserId);
    const ownedSchool = await this.db
      .select({ id: school.id })
      .from(school)
      .where(and(eq(school.id, schoolId), eq(school.ownerUserId, ownerUserId)))
      .get();

    if (!ownedSchool) {
      throw new Error('Selected school was not found.');
    }

    return ownerUserId;
  }

  private async selectForSchool(schoolId: number): Promise<SelectSchoolTheme[]> {
    return this.db
      .select()
      .from(schoolThemes)
      .where(eq(schoolThemes.schoolId, schoolId))
      .orderBy(desc(schoolThemes.updatedAt));
  }

  private async findByKey(
    schoolId: number,
    themeKey: string,
  ): Promise<SelectSchoolTheme | null> {
    const row = await this.db
      .select()
      .from(schoolThemes)
      .where(
        and(eq(schoolThemes.schoolId, schoolId), eq(schoolThemes.themeKey, themeKey)),
      )
      .get();

    return row ?? null;
  }
}

function toListedTheme(theme: SelectSchoolTheme): ListedSchoolTheme {
  return {
    key: theme.themeKey,
    nameEn: theme.nameEn,
    nameSw: theme.nameSw,
    isActive: theme.isActive,
    isBundled: false,
  };
}

export type { ThemeDocument };
