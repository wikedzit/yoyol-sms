export type CombinationRecord = {
  id: number;
  name: string;
  status: string;
};

export type CombinationSubject = {
  id: number;
  name: string;
  code: string;
};

export type CombinationLink = {
  combinationId: number;
  subjectId: number;
};

export function refusalToChangeCombination(input: {
  status: string;
  change: 'add' | 'remove' | 'retire';
  subjectLevelType: string | null;
}): string | null {
  if (input.status === 'retired' && input.change !== 'retire') {
    return 'That combination is retired.';
  }
  if (input.change === 'add' && input.subjectLevelType !== 'a-level') {
    return 'Only an A-Level subject can be added to a combination.';
  }
  return null;
}

export function describeCombinations(input: {
  combinations: readonly CombinationRecord[];
  subjects: readonly CombinationSubject[];
  links: readonly CombinationLink[];
}): string[] {
  return input.combinations.map((combination) => {
    if (combination.status === 'retired') {
      return `${combination.name} (retired)`;
    }
    const names = input.links
      .filter((link) => link.combinationId === combination.id)
      .map((link) => input.subjects.find((subject) => subject.id === link.subjectId))
      .filter((subject): subject is CombinationSubject => subject !== undefined)
      .map((subject) => `${subject.name} (${subject.code})`);
    if (names.length === 0) {
      return combination.name;
    }
    return `${combination.name}: ${names.join(', ')}`;
  });
}
