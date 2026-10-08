export type FormClassSubjectClass = {
  id: number;
  name: string;
  levelId: number;
  streamId: number;
  formId: number;
};

export type NamedRecord = { id: number; name: string };

export type FormClassSubjectAssignment = {
  formClassId: number;
  subjectId: number;
};

export function describeFormClassSubjects(input: {
  levels: readonly NamedRecord[];
  streams: readonly NamedRecord[];
  forms: readonly NamedRecord[];
  classes: readonly FormClassSubjectClass[];
  subjects: readonly { id: number; name: string; code: string }[];
  assignments: readonly FormClassSubjectAssignment[];
}): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const assignment of input.assignments) {
    const key = `${assignment.formClassId}:${assignment.subjectId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const formClass = input.classes.find((item) => item.id === assignment.formClassId);
    const subject = input.subjects.find((item) => item.id === assignment.subjectId);
    const level = input.levels.find((item) => item.id === formClass?.levelId);
    const stream = input.streams.find((item) => item.id === formClass?.streamId);
    const form = input.forms.find((item) => item.id === formClass?.formId);
    if (!formClass || !subject || !level || !stream || !form) {
      continue;
    }
    lines.push(`${level.name} / ${stream.name} / ${form.name} / ${formClass.name}: ${subject.name} (${subject.code})`);
  }
  return lines;
}
