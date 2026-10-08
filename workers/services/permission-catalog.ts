import { appModules } from '../kernel/modules';

export const permissionCatalog = appModules.flatMap((module) =>
  module.permissions.map((permission) => ({
    key: permission.key,
    label: permission.label.en,
  })),
);

const permissionKeys = [
  'school.profile.read',
  'school.profile.update',
  'school.archive',
  'school.member.manage',
  'school.role.manage',
  'campus.manage',
  'students.record.read',
  'students.record.write',
  'staff.record.read',
  'staff.record.write',
  'attendance.record.read',
  'attendance.record.write',
  'finance.invoice.view',
  'finance.payment.record',
  'timetable.entry.read',
  'timetable.entry.write',
  'lesson-plans.plan.read',
  'lesson-plans.plan.write',
  'lesson-plans.plan.review',
  'discipline.incident.read',
  'discipline.incident.write',
  'discipline.incident.close',
  'clubs.club.read',
  'clubs.club.write',
  'clubs.activity.write',
  'leadership.position.read',
  'leadership.position.write',
  'reports.dashboard.read',
  'reports.import.write',
] as const;

export type PermissionKey = (typeof permissionKeys)[number];

export function isPermissionKey(value: string): value is PermissionKey {
  return permissionKeys.some((key) => key === value);
}

export const grantsByRole: Record<string, readonly PermissionKey[]> = {
  admin: permissionKeys,
  teacher: permissionsForRole('teacher'),
  finance: permissionsForRole('finance'),
  student: permissionsForRole('student'),
  parent: permissionsForRole('parent'),
};

function permissionsForRole(roleKey: string): readonly PermissionKey[] {
  return appModules.flatMap((module) =>
    module.permissions
      .filter((permission) => permission.defaultRoles.includes(roleKey))
      .map((permission) => permission.key),
  ).filter(isPermissionKey);
}
