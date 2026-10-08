export type EnrolmentStatus = 'enrolled' | 'left' | 'transferred' | 'promoted' | 'graduated';

export type YearEnrolment = {
  studentId: number;
  academicYearId: number;
  formClassId: number | null;
  status: EnrolmentStatus;
};

export function refusalToEnrolTwice(existing: YearEnrolment | null): string | null {
  if (existing) {
    return 'This student is already enrolled for that year.';
  }
  return null;
}

// A registration can leave a year row with no class. Placing that student in a class
// is the first enrolment, not a second one.
export function enrolmentPlacement(
  existing: YearEnrolment | null,
  formClassId: number | null,
): 'create' | 'assign-class' | 'refuse' {
  if (!existing) {
    return 'create';
  }
  if (existing.status === 'enrolled' && existing.formClassId == null && formClassId != null) {
    return 'assign-class';
  }
  return 'refuse';
}

export function classMove(input: {
  status: EnrolmentStatus;
  currentFormClassId: number | null;
  nextFormClassId: number;
  reason: string;
}): { formClassId: number; moveReason: string } {
  if (input.status !== 'enrolled') {
    throw new Error('Only an open enrolment can move class.');
  }
  const reason = input.reason.trim();
  if (reason.length === 0) {
    throw new Error('Record why this student is moving class.');
  }
  if (input.currentFormClassId === input.nextFormClassId) {
    throw new Error('Choose a different class.');
  }
  return { formClassId: input.nextFormClassId, moveReason: reason };
}

export function endedEnrolment(status: string): 'left' | 'transferred' {
  if (status === 'left' || status === 'transferred') {
    return status;
  }
  throw new Error('End an enrolment as left or transferred.');
}

export type PromotionEnrolment = {
  enrolmentId: number;
  studentId: number;
  formClassId: number | null;
  status: string;
};

export type KeptClass = {
  enrolmentId: number;
  studentId: number;
  pastFormClassId: number;
};

export function promotionPlan(input: {
  sourceClassId: number;
  formNumber: number;
  levelType: string;
  laterFormExists: boolean;
  enrolments: readonly PromotionEnrolment[];
  selectedStudentIds: readonly number[];
  wholeClass: boolean;
  nextYearId: number;
  sourceYearId: number;
  alreadyInNextYear: readonly number[];
}): { promote: KeptClass[]; graduate: KeptClass[] } {
  const enrolledHere = input.enrolments.filter((enrolment) => (
    enrolment.formClassId === input.sourceClassId && enrolment.status === 'enrolled'
  ));
  const chosenIds = input.wholeClass
    ? enrolledHere.map((enrolment) => enrolment.studentId)
    : input.selectedStudentIds;
  if (chosenIds.length === 0) {
    throw new Error('Choose at least one student.');
  }

  const step = nextFormStep(input.formNumber, input.levelType, input.laterFormExists);
  if (step === 'promote' && input.nextYearId === input.sourceYearId) {
    throw new Error('Choose a later academic year.');
  }

  const promote: KeptClass[] = [];
  const graduate: KeptClass[] = [];
  for (const studentId of chosenIds) {
    const enrolment = enrolledHere.find((item) => item.studentId === studentId);
    if (!enrolment || enrolment.formClassId === null) {
      throw new Error('That student is not enrolled in this class.');
    }
    const kept = {
      enrolmentId: enrolment.enrolmentId,
      studentId,
      pastFormClassId: enrolment.formClassId,
    };
    if (step === 'graduate') {
      graduate.push(kept);
      continue;
    }
    if (input.alreadyInNextYear.includes(studentId)) {
      throw new Error('This student is already enrolled for that year.');
    }
    promote.push(kept);
  }
  return { promote, graduate };
}

function nextFormStep(formNumber: number, levelType: string, laterFormExists: boolean): 'promote' | 'graduate' {
  const finalFormNumber = levelType === 'a-level' ? 6 : 4;
  if (formNumber >= finalFormNumber) {
    return 'graduate';
  }
  if (!laterFormExists) {
    throw new Error('Create the next form before promoting this class.');
  }
  return 'promote';
}

export function describeEnrolments(rows: readonly {
  studentName: string;
  yearName: string;
  className: string | null;
  status: string;
  moveReason: string | null;
}[]): string[] {
  return rows.map((row) => {
    const place = row.className ? `${row.yearName} / ${row.className}` : row.yearName;
    const reason = row.moveReason ? `, moved: ${row.moveReason}` : '';
    return `${row.studentName}, ${place} (${row.status})${reason}`;
  });
}
