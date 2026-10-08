export type CalendarYear = {
  id: number;
  status: string;
};

export type CalendarTerm = {
  id: number;
  isCurrent: boolean;
};

export function activeYearPlan(years: readonly CalendarYear[], nextActiveId: number): {
  activateId: number;
  archiveIds: number[];
} {
  if (!years.some((year) => year.id === nextActiveId)) {
    throw new Error('That academic year was not found.');
  }
  return {
    activateId: nextActiveId,
    archiveIds: years
      .filter((year) => year.status === 'active' && year.id !== nextActiveId)
      .map((year) => year.id),
  };
}

export function currentTermPlan(terms: readonly CalendarTerm[], nextCurrentId: number): {
  currentId: number;
  clearIds: number[];
} {
  if (!terms.some((term) => term.id === nextCurrentId)) {
    throw new Error('That term was not found.');
  }
  return {
    currentId: nextCurrentId,
    clearIds: terms
      .filter((term) => term.isCurrent && term.id !== nextCurrentId)
      .map((term) => term.id),
  };
}

export function refusalToEditArchivedYear(
  status: string,
  changes: { name?: string; startDate?: string; endDate?: string },
): string | null {
  if (status !== 'archived') {
    return null;
  }
  if (changes.name || changes.startDate || changes.endDate) {
    return 'An archived year keeps its name and dates.';
  }
  return null;
}

export function refusalToDeleteYear(input: {
  enrolmentCount: number;
  resultCount: number;
  invoiceCount: number;
}): string | null {
  if (input.enrolmentCount > 0 || input.resultCount > 0 || input.invoiceCount > 0) {
    return 'This year still has enrolments, results, or invoices.';
  }
  return null;
}

export function refusalToDeleteTerm(input: {
  resultCount: number;
  attendanceCount: number;
}): string | null {
  if (input.resultCount > 0 || input.attendanceCount > 0) {
    return 'This term still has results or attendance.';
  }
  return null;
}

export function describeAcademicCalendar(input: {
  years: readonly { id: number; name: string; status: string }[];
  terms: readonly { academicYearId: number; name: string; isCurrent: boolean }[];
}): string[] {
  const lines: string[] = [];
  for (const year of input.years) {
    lines.push(`${year.name} (${year.status})`);
    for (const term of input.terms.filter((item) => item.academicYearId === year.id)) {
      lines.push(term.isCurrent ? `${year.name} / ${term.name} (current)` : `${year.name} / ${term.name}`);
    }
  }
  return lines;
}
