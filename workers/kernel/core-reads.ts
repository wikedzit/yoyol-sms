export const capabilityCatalogue = {
  'core.academics:read': { sensitive: false },
  'core.students:read': { sensitive: true },
  'core.students:write': { sensitive: true },
  'core.guardians:read': { sensitive: true },
  'core.guardians.contact:read': { sensitive: true },
  'core.staff:read': { sensitive: false },
  'core.users:read': { sensitive: false },
  'notifications:send': { sensitive: false },
  'files:read': { sensitive: false },
  'files:write': { sensitive: false },
  'jobs:schedule': { sensitive: false },
} as const;

export type CatalogueCapability = keyof typeof capabilityCatalogue;

const extensionCapability = /^extension:[a-z][a-z0-9-]{1,31}$/;

export function isCatalogueCapability(capability: string): boolean {
  return capability in capabilityCatalogue || extensionCapability.test(capability);
}

export function requireCapability(granted: readonly string[], capability: CatalogueCapability): void {
  if (!granted.includes(capability)) {
    throw new Error(`This extension does not have ${capability}.`);
  }
}

export type StudentIdentity = {
  id: number;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  formClassId: number | null;
};

export type GuardianName = {
  id: number;
  guardianName: string | null;
};

export type GuardianContact = GuardianName & {
  guardianPhone: string | null;
  address: string | null;
};

export type StaffName = {
  id: number;
  firstName: string;
  lastName: string;
};

export type ClassName = {
  id: number;
  name: string;
};

export type StaffAssignment = {
  teacherId: number;
  classId: number | null;
  subjectId: number | null;
};

export async function readStudentIdentities<Row>(input: {
  granted: readonly string[];
  schoolId: number;
  load: (schoolId: number) => Promise<Row[]>;
  present: (row: Row) => StudentIdentity;
}): Promise<StudentIdentity[]> {
  requireCapability(input.granted, 'core.students:read');
  const rows = await input.load(input.schoolId);
  return rows.map(input.present);
}

export async function readGuardianNames<Row>(input: {
  granted: readonly string[];
  schoolId: number;
  load: (schoolId: number) => Promise<Row[]>;
  present: (row: Row) => GuardianName;
}): Promise<GuardianName[]> {
  requireCapability(input.granted, 'core.guardians:read');
  const rows = await input.load(input.schoolId);
  return rows.map(input.present);
}

export async function readGuardianContacts<Row>(input: {
  granted: readonly string[];
  schoolId: number;
  load: (schoolId: number) => Promise<Row[]>;
  present: (row: Row) => GuardianContact;
}): Promise<GuardianContact[]> {
  requireCapability(input.granted, 'core.guardians.contact:read');
  const rows = await input.load(input.schoolId);
  return rows.map(input.present);
}

export async function readStaffNames<Row>(input: {
  granted: readonly string[];
  schoolId: number;
  load: (schoolId: number) => Promise<Row[]>;
  present: (row: Row) => StaffName;
}): Promise<StaffName[]> {
  requireCapability(input.granted, 'core.staff:read');
  const rows = await input.load(input.schoolId);
  return rows.map(input.present);
}

export async function readStaffAssignments<Row>(input: {
  granted: readonly string[];
  schoolId: number;
  load: (schoolId: number) => Promise<Row[]>;
  present: (row: Row) => StaffAssignment;
}): Promise<StaffAssignment[]> {
  requireCapability(input.granted, 'core.staff:read');
  const rows = await input.load(input.schoolId);
  return rows.map(input.present);
}

export async function readAcademicStructure<Level, Stream, Form, ClassRow>(input: {
  granted: readonly string[];
  schoolId: number;
  load: (schoolId: number) => Promise<{
    levels: Level[];
    streams: Stream[];
    forms: Form[];
    classes: ClassRow[];
  }>;
}): Promise<{
  levels: Level[];
  streams: Stream[];
  forms: Form[];
  classes: ClassRow[];
}> {
  requireCapability(input.granted, 'core.academics:read');
  return input.load(input.schoolId);
}

export async function readAcademicCalendar<Year, Term>(input: {
  granted: readonly string[];
  schoolId: number;
  load: (schoolId: number) => Promise<{ years: Year[]; terms: Term[] }>;
}): Promise<{ years: Year[]; terms: Term[] }> {
  requireCapability(input.granted, 'core.academics:read');
  return input.load(input.schoolId);
}

export async function readAcademicSubjects<Subject, Level, Stream>(input: {
  granted: readonly string[];
  schoolId: number;
  load: (schoolId: number) => Promise<{ subjects: Subject[]; levels: Level[]; streams: Stream[] }>;
}): Promise<{ subjects: Subject[]; levels: Level[]; streams: Stream[] }> {
  requireCapability(input.granted, 'core.academics:read');
  return input.load(input.schoolId);
}

export async function readFormClassSubjects<Row>(input: {
  granted: readonly string[];
  schoolId: number;
  load: (schoolId: number) => Promise<Row>;
}): Promise<Row> {
  requireCapability(input.granted, 'core.academics:read');
  return input.load(input.schoolId);
}

export async function readCombinations<Row>(input: {
  granted: readonly string[];
  schoolId: number;
  load: (schoolId: number) => Promise<Row>;
}): Promise<Row> {
  requireCapability(input.granted, 'core.academics:read');
  return input.load(input.schoolId);
}

export async function readClassNames<Row>(input: {
  granted: readonly string[];
  schoolId: number;
  load: (schoolId: number) => Promise<Row[]>;
  present: (row: Row) => ClassName;
}): Promise<ClassName[]> {
  requireCapability(input.granted, 'core.academics:read');
  const rows = await input.load(input.schoolId);
  return rows.map(input.present);
}
