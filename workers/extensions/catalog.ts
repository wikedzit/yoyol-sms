import { bundledManifests, findBundledManifest } from '../kernel/bundled-manifests';

export type BundledExtension = {
  key: string;
  type: 'plugin' | 'module';
  nameEn: string;
  nameSw: string;
  descriptionEn: string;
  descriptionSw: string;
  required: boolean;
  version: string;
};

export const bundledExtensions: BundledExtension[] = bundledManifests.map((manifest) => ({
  key: manifest.key,
  type: manifest.type,
  nameEn: manifest.name.en,
  nameSw: manifest.name.sw,
  descriptionEn: manifest.description.en,
  descriptionSw: manifest.description.sw,
  required: manifest.required === true,
  version: manifest.version,
}));

export function findBundledExtension(key: string): BundledExtension | null {
  return bundledExtensions.find((extension) => extension.key === key) ?? null;
}

export { findBundledManifest };
