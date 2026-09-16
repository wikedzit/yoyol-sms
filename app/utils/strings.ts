export function toTitleCase(s: string): string {
  if (!s) return s;
  return s
    .toLowerCase()
    .replace(/(?:^|[\s'-])([a-z])/g, (match) => match.toUpperCase());
}
