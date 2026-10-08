export function refusalToInviteGuardian(guardian: {
  email: string | null;
  userId: number | null;
}): string | null {
  if (guardian.userId != null) {
    return 'This guardian already has an account.';
  }
  const email = guardian.email?.trim() ?? '';
  if (email.length === 0) {
    return 'Add an email before inviting this guardian.';
  }
  return null;
}

export function studentsVisibleToParent(input: {
  linkedStudentIds: readonly number[];
  requestedStudentIds: readonly number[];
}): number[] {
  const linked = new Set(input.linkedStudentIds);
  return input.requestedStudentIds.filter((studentId) => linked.has(studentId));
}

type StudentLineNode = {
  type: string;
  value?: unknown;
  body?: StudentLineNode[];
};

export function keepStudentLines<T extends StudentLineNode>(
  nodes: readonly T[],
  names: readonly string[],
): T[] {
  return nodes.flatMap((node) => {
    if (node.type === 'text' && typeof node.value === 'string') {
      const line = node.value;
      const shown = names.some((name) => line.startsWith(`${name},`) || line.startsWith(`${name}:`));
      return shown ? [node] : [];
    }
    if (node.body) {
      return [{ ...node, body: keepStudentLines(node.body, names) }];
    }
    return [node];
  });
}
