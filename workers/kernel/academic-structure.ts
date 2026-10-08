export type AcademicLevelRow = { id: number; name: string };
export type AcademicStreamRow = { id: number; levelId: number; name: string };
export type AcademicFormRow = { id: number; streamId: number; name: string };
export type AcademicClassRow = { id: number; formId: number; name: string };

export function refusalToRemoveLevel(input: {
  streamCount: number;
  classCount: number;
  subjectCount: number;
}): string | null {
  if (input.streamCount > 0 || input.classCount > 0 || input.subjectCount > 0) {
    return 'Remove the streams, classes, and subjects on this level first.';
  }
  return null;
}

export function refusalToRemoveStream(input: {
  formCount: number;
  classCount: number;
}): string | null {
  if (input.formCount > 0 || input.classCount > 0) {
    return 'Remove the forms and classes on this stream first.';
  }
  return null;
}

export function refusalToRemoveForm(classCount: number): string | null {
  if (classCount > 0) {
    return 'Remove the classes on this form first.';
  }
  return null;
}

export function enrolmentCountByClass(
  students: readonly { formClassId: number | null }[],
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const student of students) {
    if (student.formClassId === null) {
      continue;
    }
    counts.set(student.formClassId, (counts.get(student.formClassId) ?? 0) + 1);
  }
  return counts;
}

export function describeAcademicStructure(input: {
  levels: readonly AcademicLevelRow[];
  streams: readonly AcademicStreamRow[];
  forms: readonly AcademicFormRow[];
  classes: readonly AcademicClassRow[];
}): string[] {
  const lines: string[] = [];
  for (const level of input.levels) {
    const streams = input.streams.filter((stream) => stream.levelId === level.id);
    if (streams.length === 0) {
      lines.push(level.name);
      continue;
    }
    for (const stream of streams) {
      const forms = input.forms.filter((form) => form.streamId === stream.id);
      if (forms.length === 0) {
        lines.push(`${level.name} / ${stream.name}`);
        continue;
      }
      for (const form of forms) {
        const classes = input.classes.filter((formClass) => formClass.formId === form.id);
        if (classes.length === 0) {
          lines.push(`${level.name} / ${stream.name} / ${form.name}`);
          continue;
        }
        for (const formClass of classes) {
          lines.push(`${level.name} / ${stream.name} / ${form.name} / ${formClass.name}`);
        }
      }
    }
  }
  return lines;
}
