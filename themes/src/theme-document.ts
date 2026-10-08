import { z } from 'zod';

export const defaultThemeKey = 'yoyol';
export const maximumThemeBytes = 64 * 1024;

const hexColour = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Colours must be hex values like #5a30f1');

const colourTokensSchema = z
  .object({
    primary: hexColour,
    primaryForeground: hexColour,
    background: hexColour,
    foreground: hexColour,
    card: hexColour,
    cardForeground: hexColour,
    secondary: hexColour,
    secondaryForeground: hexColour,
    muted: hexColour,
    mutedForeground: hexColour,
    accent: hexColour,
    accentForeground: hexColour,
    border: hexColour,
    ring: hexColour,
    primaryEnd: hexColour.optional(),
    sidebar: hexColour,
    sidebarForeground: hexColour,
    sidebarPrimary: hexColour,
    sidebarPrimaryForeground: hexColour,
    sidebarAccent: hexColour,
    sidebarAccentForeground: hexColour,
    sidebarBorder: hexColour,
  })
  .strict();

export const themeDocumentSchema = z
  .object({
    themeVersion: z.literal(1),
    key: z
      .string()
      .regex(/^[a-z][a-z0-9-]{1,31}$/, 'Theme key must be a short lowercase name'),
    name: z
      .object({
        en: z.string().trim().min(1).max(40),
        sw: z.string().trim().min(1).max(40),
      })
      .strict(),
    light: colourTokensSchema,
    dark: colourTokensSchema,
  })
  .strict();

export type ThemeDocument = z.infer<typeof themeDocumentSchema>;
export type ColourTokens = z.infer<typeof colourTokensSchema>;

const cssVariables: Record<Exclude<keyof ColourTokens, 'primaryEnd'>, string> = {
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  border: '--border',
  ring: '--ring',
  sidebar: '--sidebar',
  sidebarForeground: '--sidebar-foreground',
  sidebarPrimary: '--sidebar-primary',
  sidebarPrimaryForeground: '--sidebar-primary-foreground',
  sidebarAccent: '--sidebar-accent',
  sidebarAccentForeground: '--sidebar-accent-foreground',
  sidebarBorder: '--sidebar-border',
};

export function parseThemeDocument(value: unknown): ThemeDocument {
  return themeDocumentSchema.parse(value);
}

export function parseThemePackage(rawText: string): ThemeDocument {
  if (rawText.length > maximumThemeBytes) {
    throw new Error('Theme files must be 64 KB or smaller.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Theme file must be JSON.');
  }

  try {
    return parseThemeDocument(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Theme file is not valid.';
      throw new Error(firstIssue);
    }
    throw error;
  }
}

function writeTokens(selector: string, tokens: ColourTokens): string {
  const lines = Object.entries(cssVariables).map(([tokenName, variableName]) => {
    const colour = tokens[tokenName as keyof ColourTokens];
    return `  ${variableName}: ${colour};`;
  });
  // A theme without its own gradient end stays a solid primary, not the default purple.
  lines.push(`  --primary-end: ${tokens.primaryEnd ?? tokens.primary};`);

  return `${selector} {\n${lines.join('\n')}\n}`;
}

// Only validated hex colours are written. Names and keys never enter the CSS.
export function buildThemeCss(document: ThemeDocument): string | null {
  if (document.key === defaultThemeKey) {
    return null;
  }

  return [
    writeTokens(':root', document.light),
    writeTokens('.dark', document.dark),
  ].join('\n');
}
