const featureId = /\b(?:SDK-CLI|KRN-IAM|KRN-DAT|KRN-REG|KRN-EVT|KRN-UIX|KRN-SVC|MOD-ACA|MOD-STU|MOD-STF|MOD-ASM|MOD-CAL|MOD-ATT|MOD-FIN|MOD-TTB|MOD-LSN|MOD-DIS|MOD-CLB|MOD-LDR|MOD-RPT|GAP-SCH|GAP-IAM|GAP-NTF|REP|ENG|RUN|SDK|PLG|DOC|OUT)-\d+\b/g;

export function featureIds(catalog: string): string[] {
  return [...new Set(catalog.match(featureId) ?? [])].sort();
}

export function idsWithoutTests(catalog: string, tests: string): string[] {
  return featureIds(catalog).filter((id) => !tests.includes(id));
}
