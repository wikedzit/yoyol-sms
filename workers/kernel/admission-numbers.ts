export const defaultAdmissionNumberFormat = '{year}-{seq:4}';

const sequenceToken = /\{seq(?::(\d+))?\}/;

export function admissionYear(enrollmentDate: string | undefined, today: Date): number {
  const match = /^(\d{4})-/.exec(enrollmentDate ?? '');
  if (match) {
    return Number(match[1]);
  }
  return today.getFullYear();
}

export function nextAdmissionNumber(input: {
  format: string;
  year: number;
  taken: readonly string[];
}): string {
  if (!sequenceToken.test(input.format)) {
    throw new Error('The admission number format needs a sequence.');
  }

  const taken = new Set(input.taken);
  for (let sequence = 1; sequence <= 9999; sequence += 1) {
    const candidate = renderAdmissionNumber(input.format, input.year, sequence);
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  throw new Error('The admission number sequence is full.');
}

export function refusalToReuseAdmissionNumber(alreadyUsed: boolean): string | null {
  if (alreadyUsed) {
    return 'This admission number is already in use.';
  }
  return null;
}

export function refusalToChangeAdmissionNumber(input: {
  reportCount: number;
  invoiceCount: number;
}): string | null {
  if (input.reportCount > 0 || input.invoiceCount > 0) {
    return 'This admission number is already on a report or invoice.';
  }
  return null;
}

function renderAdmissionNumber(format: string, year: number, sequence: number): string {
  const withYear = format.replace(/\{year\}/g, String(year));
  return withYear.replace(sequenceToken, (_match, width: string | undefined) => {
    const digits = width ? Number(width) : 0;
    const text = String(sequence);
    return digits > 0 ? text.padStart(digits, '0') : text;
  });
}
