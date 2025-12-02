import type { LevelType } from '~/type/shools';

// Configuration for academic levels and their forms
export const LEVEL_CONFIG = {
  'o-level': {
    name: 'O-Level',
    description: 'Ordinary Level Secondary Education (Form 1-4)',
    forms: [
      { number: 1, name: 'Form 1' },
      { number: 2, name: 'Form 2' },
      { number: 3, name: 'Form 3' },
      { number: 4, name: 'Form 4' },
    ],
    basePath: '/levels/o-level',
  },
  'a-level': {
    name: 'A-Level',
    description: 'Advanced Level Secondary Education (Form 5-6)',
    forms: [
      { number: 5, name: 'Form 5' },
      { number: 6, name: 'Form 6' },
    ],
    basePath: '/levels/a-level',
  },
} as const;

export type LevelConfig = (typeof LEVEL_CONFIG)[LevelType];

// Helper to get forms for a level type
export function getFormsForLevel(levelType: LevelType) {
  return LEVEL_CONFIG[levelType].forms;
}

// Helper to get level config
export function getLevelConfig(levelType: LevelType) {
  return LEVEL_CONFIG[levelType];
}

// Helper to determine level type from form number
export function getLevelTypeFromFormNumber(formNumber: number): LevelType {
  if (formNumber >= 1 && formNumber <= 4) return 'o-level';
  if (formNumber >= 5 && formNumber <= 6) return 'a-level';
  throw new Error(`Invalid form number: ${formNumber}`);
}

// Helper to validate form number for a level
export function isValidFormForLevel(levelType: LevelType, formNumber: number): boolean {
  const config = LEVEL_CONFIG[levelType];
  return config.forms.some((f) => f.number === formNumber);
}

