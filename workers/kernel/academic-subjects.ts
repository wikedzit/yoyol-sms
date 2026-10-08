export type LinkedSubject = {
  name: string;
  code: string;
  levelId: number | null;
  streamId: number | null;
};

export type SubjectLevel = { id: number; name: string };
export type SubjectStream = { id: number; levelId: number; name: string };

export function subjectLevelLink(input: {
  levelId: number;
  streamId: number | null;
  streams: readonly SubjectStream[];
}): { levelId: number; streamId: number | null } | { error: string } {
  if (input.streamId === null) {
    return { levelId: input.levelId, streamId: null };
  }
  const stream = input.streams.find((item) => item.id === input.streamId);
  if (!stream || stream.levelId !== input.levelId) {
    return { error: 'Choose a stream from the same level.' };
  }
  return { levelId: input.levelId, streamId: input.streamId };
}

export function levelIdForSubject(subject: LinkedSubject, streams: readonly SubjectStream[]): number | null {
  if (subject.levelId !== null) {
    return subject.levelId;
  }
  const stream = streams.find((item) => item.id === subject.streamId);
  return stream?.levelId ?? null;
}

export function describeLinkedSubjects(input: {
  subjects: readonly LinkedSubject[];
  levels: readonly SubjectLevel[];
  streams: readonly SubjectStream[];
}): string[] {
  const lines: string[] = [];
  for (const subject of input.subjects) {
    const levelId = levelIdForSubject(subject, input.streams);
    const level = input.levels.find((item) => item.id === levelId);
    if (!level) {
      continue;
    }
    const stream = input.streams.find((item) => item.id === subject.streamId);
    const place = stream ? `${level.name} / ${stream.name}` : level.name;
    lines.push(`${place} / ${subject.name} (${subject.code})`);
  }
  return lines;
}
