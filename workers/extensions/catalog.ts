export type BundledExtension = {
  key: string;
  type: 'plugin' | 'module';
  nameEn: string;
  nameSw: string;
  descriptionEn: string;
  descriptionSw: string;
};

// Extensions compiled into this app. Zip packages join this list later.
export const bundledExtensions: BundledExtension[] = [
  {
    key: 'themes',
    type: 'plugin',
    nameEn: 'Site themes',
    nameSw: 'Mandhari ya tovuti',
    descriptionEn: 'Install colour themes for a school and choose which one is active.',
    descriptionSw: 'Sakinisha mandhari ya rangi kwa shule na chagua linalotumika.',
  },
];

export function findBundledExtension(key: string): BundledExtension | null {
  return bundledExtensions.find((extension) => extension.key === key) ?? null;
}
