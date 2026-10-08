export type AppLanguage = 'en' | 'sw';

export type LocaleCatalog = {
  en: Record<string, string>;
  sw: Record<string, string>;
};

const months: Record<AppLanguage, readonly string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  sw: ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'],
};

const minorDigits: Record<string, number> = {
  TZS: 2,
  KES: 2,
  UGX: 0,
  USD: 2,
};

export function translate(
  catalog: LocaleCatalog,
  language: AppLanguage,
  key: string,
  params?: Record<string, string | number>,
): string {
  const template = catalog[language][key] ?? catalog.en[key] ?? key;
  if (!params) {
    return template;
  }
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (token, name: string) => {
    const value = params[name];
    return value === undefined ? token : String(value);
  });
}

export function formatDate(value: string, language: AppLanguage): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return value;
  }
  const month = months[language][Number(match[2]) - 1];
  if (!month) {
    return value;
  }
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function formatNumber(value: number, language: AppLanguage, style: 'decimal' | 'percent' = 'decimal'): string {
  const locale = language === 'sw' ? 'sw-TZ' : 'en-TZ';
  if (style === 'percent') {
    return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(value);
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

export function formatMoney(amountMinor: number, currency: string, language: AppLanguage): string {
  const digits = minorDigits[currency] ?? 2;
  const major = amountMinor / 10 ** digits;
  const locale = language === 'sw' ? 'sw-TZ' : 'en-TZ';
  const amount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(major);
  return `${currency} ${amount}`;
}
