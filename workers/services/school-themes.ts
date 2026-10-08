import { and, desc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import greenThemeJson from '../../themes/themes/green.json';
import yoyolThemeJson from '../../themes/themes/yoyol-default.json';
import {
  buildThemeCss,
  defaultThemeKey,
  parseThemeDocument,
  parseThemePackage,
  themesOfferedToSchool,
  type ThemeDocument,
} from '../../themes/src/theme-document';
import { school } from '../database/school';
import {
  schoolThemes,
  type SelectSchoolTheme,
} from '../database/school-themes';
import { requireOwnerUserId, requireSchoolId } from 'workers/utils/require-owner-user';

export type ListedSchoolTheme = {
  key: string;
  nameEn: string;
  nameSw: string;
  isActive: boolean;
  isBundled: boolean;
};

const systemThemes: ThemeDocument[] = [yoyolThemeJson, greenThemeJson].map((theme) =>
  parseThemeDocument(theme),
);

function systemTheme(themeKey: string): ThemeDocument | null {
  return systemThemes.find((theme) => theme.key === themeKey) ?? null;
}

export default class SchoolThemeService {
  constructor(
    private db: AppDatabase,
    private ownerUserId: number | null,
    private activeSchoolId: number | null = null,
  ) {}

  async listForSchool(schoolId: number): Promise<ListedSchoolTheme[]> {
    await this.requireOwnedSchool(schoolId);

    try {
      const uploaded = await this.selectForSchool(schoolId);
      return themesOfferedToSchool(
        systemThemes,
        uploaded.map((theme) => ({
          key: theme.themeKey,
          nameEn: theme.nameEn,
          nameSw: theme.nameSw,
          isActive: theme.isActive,
        })),
      );
    } catch (error) {
      console.error('Unable to list site themes:', error);
      return themesOfferedToSchool(systemThemes, []);
    }
  }

  async savePackage(schoolId: number, rawText: string): Promise<void> {
    const ownerUserId = await this.requireOwnedSchool(schoolId);
    const document = parseThemePackage(rawText);

    if (systemTheme(document.key)) {
      throw new Error('That theme comes with the system and cannot be replaced.');
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

    const bundled = systemTheme(themeKey);
    if (bundled) {
      await this.saveActiveSystemTheme(schoolId, bundled, now);
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
      requireOwnerUserId(this.ownerUserId);
      const active = await this.db
        .select({
          themeKey: schoolThemes.themeKey,
          tokensJson: schoolThemes.tokensJson,
        })
        .from(schoolThemes)
        .innerJoin(school, eq(schoolThemes.schoolId, school.id))
        .where(
          and(
            eq(school.id, requireSchoolId(this.activeSchoolId)),
            eq(schoolThemes.isActive, true),
          ),
        )
        .orderBy(desc(schoolThemes.updatedAt))
        .limit(1)
        .get();

      if (!active) {
        return null;
      }

      const bundled = systemTheme(active.themeKey);
      const document = bundled ?? parseThemePackage(active.tokensJson);
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
      .where(and(eq(school.id, schoolId), eq(school.id, requireSchoolId(this.activeSchoolId))))
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

  private async saveActiveSystemTheme(
    schoolId: number,
    document: ThemeDocument,
    now: number,
  ): Promise<void> {
    const saved = {
      nameEn: document.name.en,
      nameSw: document.name.sw,
      tokensJson: JSON.stringify(document),
      isActive: true,
      updatedAt: now,
    };
    const existing = await this.findByKey(schoolId, document.key);
    if (existing) {
      await this.db
        .update(schoolThemes)
        .set(saved)
        .where(eq(schoolThemes.id, existing.id));
      return;
    }

    await this.db.insert(schoolThemes).values({
      schoolId,
      themeKey: document.key,
      ...saved,
      createdAt: now,
    });
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

export type { ThemeDocument };
