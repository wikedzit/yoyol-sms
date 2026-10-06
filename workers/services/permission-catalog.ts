export const permissionCatalog = [
  { key: 'school.profile.read', label: 'View the school' },
  { key: 'school.profile.update', label: 'Update the school profile' },
  { key: 'school.archive', label: 'Archive or restore the school' },
  { key: 'school.member.manage', label: 'Manage school members' },
  { key: 'school.role.manage', label: 'Manage school roles' },
  { key: 'campus.manage', label: 'Manage campuses' },
  { key: 'students.record.read', label: 'View student records' },
  { key: 'students.record.write', label: 'Change student records' },
  { key: 'staff.record.read', label: 'View staff records' },
  { key: 'staff.record.write', label: 'Change staff records' },
] as const;

export function isPermissionKey(value: string): value is PermissionKey {
  return permissionCatalog.some((permission) => permission.key === value);
}

export type PermissionKey = (typeof permissionCatalog)[number]['key'];

export const grantsByRole: Record<string, readonly PermissionKey[]> = {
  admin: permissionCatalog.map((permission) => permission.key),
  teacher: ['school.profile.read', 'students.record.read'],
  finance: ['school.profile.read'],
  student: ['school.profile.read', 'students.record.read'],
  parent: ['school.profile.read', 'students.record.read'],
};
