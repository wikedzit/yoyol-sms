export type Permission =
  | 'dashboard.view'
  | 'students.view'
  | 'students.manage'
  | 'teachers.view'
  | 'teachers.manage'
  | 'admissions.manage'
  | 'attendance.manage'
  | 'timetable.manage'
  | 'finance.view'
  | 'finance.manage'
  | 'grades.manage'
  | 'reports.view'
  | 'admin-management.manage'
  | 'system-settings.manage'
  | 'roles.manage'
  | 'audit.view'
  | 'billing.manage'
  | 'notifications.manage'
  | 'schools.switch';

export type AppRole =
  | 'super_admin'
  | 'admin'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'finance';

export function isAdminRole(role: string): boolean {
  const normalizedRole = role.trim().toLowerCase();
  return normalizedRole === 'admin' || normalizedRole === 'super_admin';
}

export function isSuperAdminRole(role: string): boolean {
  return role.trim().toLowerCase() === 'super_admin';
}

const ADMIN_PERMISSIONS: ReadonlySet<Permission> = new Set([
  'dashboard.view',
  'students.view',
  'students.manage',
  'teachers.view',
  'teachers.manage',
  'admissions.manage',
  'attendance.manage',
  'timetable.manage',
  'finance.view',
  'grades.manage',
  'reports.view',
  'notifications.manage',
]);

const SUPER_ADMIN_PERMISSIONS: ReadonlySet<Permission> = new Set([
  ...ADMIN_PERMISSIONS,
  'finance.manage',
  'admin-management.manage',
  'system-settings.manage',
  'roles.manage',
  'audit.view',
  'billing.manage',
  'schools.switch',
]);

const ROLE_PERMISSIONS: Record<AppRole, ReadonlySet<Permission>> = {
  super_admin: SUPER_ADMIN_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  teacher: new Set(['dashboard.view', 'students.view', 'grades.manage']),
  student: new Set(['dashboard.view']),
  parent: new Set(['dashboard.view']),
  finance: new Set(['dashboard.view', 'finance.view']),
};

export function hasPermission(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role.trim().toLowerCase() as AppRole]?.has(permission) ?? false;
}

export function permissionsForRole(role: string): ReadonlySet<Permission> {
  return ROLE_PERMISSIONS[role.trim().toLowerCase() as AppRole] ?? new Set<Permission>();
}
