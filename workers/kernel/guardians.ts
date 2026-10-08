export function refusalToRemoveLinkedGuardian(linkCount: number): string | null {
  if (linkCount > 0) {
    return 'Remove the student links before deleting this guardian.';
  }
  return null;
}

export function refusalToLinkTwice(alreadyLinked: boolean): string | null {
  if (alreadyLinked) {
    return 'That guardian is already linked to this student.';
  }
  return null;
}

export function primaryContactPlan(
  links: readonly { id: number; studentId: number; isPrimary: boolean }[],
  linkId: number,
): { primaryId: number; clearIds: number[] } {
  const link = links.find((item) => item.id === linkId);
  if (!link) {
    throw new Error('That guardian link was not found.');
  }
  return {
    primaryId: link.id,
    clearIds: links
      .filter((item) => item.studentId === link.studentId && item.isPrimary && item.id !== link.id)
      .map((item) => item.id),
  };
}

export function describeGuardianLinks(rows: readonly {
  studentName: string;
  guardianName: string;
  relationship: string;
  primary: boolean;
}[]): string[] {
  return rows.map((row) => {
    const role = row.primary ? `${row.relationship}, primary` : row.relationship;
    return `${row.studentName}: ${row.guardianName} (${role})`;
  });
}
