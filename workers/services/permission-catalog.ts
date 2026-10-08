export type PermissionDefinition = {
  key: string;
  extensionKey: string;
  label: string;
  description: string;
};

export type SystemRoleDefinition = {
  key: string;
  name: string;
};

// Core permission names. An extension registers its own names when it is enabled.
export const corePermissions: PermissionDefinition[] = [
  {
    key: 'school.school.read',
    extensionKey: 'school',
    label: 'View school',
    description: 'Read the current school profile.',
  },
  {
    key: 'school.school.create',
    extensionKey: 'school',
    label: 'Create school',
    description: 'Create another school for this account.',
  },
  {
    key: 'school.school.update',
    extensionKey: 'school',
    label: 'Update school',
    description: 'Change the current school profile.',
  },
  {
    key: 'school.school.delete',
    extensionKey: 'school',
    label: 'Delete school',
    description: 'Delete a school this account belongs to.',
  },
  {
    key: 'school.role.delete',
    extensionKey: 'school',
    label: 'Delete role',
    description: 'Delete a custom role. System roles cannot be deleted.',
  },
  {
    key: 'students.student.read',
    extensionKey: 'students',
    label: 'View students',
    description: 'Read student records in the current school.',
  },
  {
    key: 'students.student.create',
    extensionKey: 'students',
    label: 'Add student',
    description: 'Add a student to the current school.',
  },
  {
    key: 'students.student.update',
    extensionKey: 'students',
    label: 'Update student',
    description: 'Change a student in the current school.',
  },
  {
    key: 'students.student.delete',
    extensionKey: 'students',
    label: 'Delete student',
    description: 'Remove a student from the current school.',
  },
  {
    key: 'teachers.teacher.read',
    extensionKey: 'teachers',
    label: 'View teachers',
    description: 'Read teacher records in the current school.',
  },
  {
    key: 'teachers.teacher.create',
    extensionKey: 'teachers',
    label: 'Add teacher',
    description: 'Add a teacher to the current school.',
  },
  {
    key: 'teachers.teacher.update',
    extensionKey: 'teachers',
    label: 'Update teacher',
    description: 'Change a teacher in the current school.',
  },
  {
    key: 'teachers.teacher.delete',
    extensionKey: 'teachers',
    label: 'Delete teacher',
    description: 'Remove a teacher from the current school.',
  },
  {
    key: 'finance.payment.record',
    extensionKey: 'finance',
    label: 'Record payment',
    description: 'Record a payment. The finance module uses this later.',
  },
];

export const systemRoles: SystemRoleDefinition[] = [
  { key: 'admin', name: 'Administrator' },
  { key: 'teacher', name: 'Teacher' },
  { key: 'finance', name: 'Finance officer' },
  { key: 'student', name: 'Student' },
  { key: 'parent', name: 'Parent' },
];

// Administrator receives every core permission. Other roles receive this list only.
export const defaultGrantsByRoleKey: Record<string, string[]> = {
  teacher: [
    'school.school.read',
    'students.student.read',
    'teachers.teacher.read',
  ],
  finance: ['school.school.read', 'finance.payment.record'],
  student: ['school.school.read'],
  parent: ['school.school.read'],
};
