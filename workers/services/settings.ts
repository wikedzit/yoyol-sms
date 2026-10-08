import { and, eq } from 'drizzle-orm';
import type { AppDatabase } from '../database/app-database';
import { extensionSettings } from '../database/extension-registry';
import { bundledManifests } from '../kernel/bundled-manifests';

export type ExtensionSettingField = {
  extensionKey: string;
  key: string;
  type: 'text' | 'select';
  options: string[];
  value: string;
};

export default class SettingsService {
  constructor(private db: AppDatabase) {}

  async list(schoolId: number): Promise<ExtensionSettingField[]> {
    const stored = await this.db
      .select()
      .from(extensionSettings)
      .where(eq(extensionSettings.schoolId, schoolId));
    const valueByKey = new Map(stored.map((row) => [`${row.extensionKey}:${row.settingKey}`, row.settingValue]));
    const fields: ExtensionSettingField[] = [];

    for (const manifest of bundledManifests) {
      for (const setting of manifest.settings) {
        const storedValue = valueByKey.get(`${manifest.key}:${setting.key}`);
        fields.push({
          extensionKey: manifest.key,
          key: setting.key,
          type: setting.type,
          options: setting.options ?? [],
          value: storedValue ?? setting.default ?? '',
        });
      }
    }
    return fields;
  }

  async set(schoolId: number, extensionKey: string, key: string, value: string): Promise<void> {
    const setting = bundledManifests
      .find((manifest) => manifest.key === extensionKey)
      ?.settings.find((item) => item.key === key);
    if (!setting) {
      throw new Error('That setting is not part of this extension.');
    }
    if (setting.type === 'select' && !setting.options?.includes(value)) {
      throw new Error('Choose one of the listed options.');
    }

    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > 200) {
      throw new Error('Use a setting value between 1 and 200 characters.');
    }

    await this.db
      .delete(extensionSettings)
      .where(and(
        eq(extensionSettings.schoolId, schoolId),
        eq(extensionSettings.extensionKey, extensionKey),
        eq(extensionSettings.settingKey, key),
      ));
    await this.db.insert(extensionSettings).values({
      schoolId,
      extensionKey,
      settingKey: key,
      settingValue: trimmed,
    });
  }
}
