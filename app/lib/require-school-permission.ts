import type { SelectSchool } from 'workers/database/school';
import type { PermissionKey } from 'workers/services/permission-catalog';
import { readRememberedSchoolId, selectSchoolId } from './selected-school';

type SchoolAccessServices = {
  tenancy: { ensureForCurrentOwner: () => Promise<void> };
  school: { getAll: () => Promise<SelectSchool[]> };
  access: {
    can: (schoolId: number, permissionKey: PermissionKey) => Promise<boolean>;
  };
};

export async function requireSchoolPermission(
  request: Request,
  services: SchoolAccessServices,
  permissionKey: PermissionKey,
  schoolId?: number | null,
): Promise<void> {
  const allowed = await schoolAllows(request, services, [permissionKey], schoolId);
  if (!allowed) {
    throw new Response('You do not have permission to do that.', { status: 403 });
  }
}

export async function requireAnySchoolPermission(
  request: Request,
  services: SchoolAccessServices,
  permissionKeys: PermissionKey[],
  schoolId?: number | null,
): Promise<void> {
  const allowed = await schoolAllows(request, services, permissionKeys, schoolId);
  if (!allowed) {
    throw new Response('You do not have permission to do that.', { status: 403 });
  }
}

async function schoolAllows(
  request: Request,
  services: SchoolAccessServices,
  permissionKeys: PermissionKey[],
  schoolId?: number | null,
): Promise<boolean> {
  await services.tenancy.ensureForCurrentOwner();
  const resolvedSchoolId = await resolveSchoolId(request, services, schoolId);
  if (resolvedSchoolId === null) {
    return true;
  }

  const checks = await Promise.all(
    permissionKeys.map((permissionKey) => services.access.can(resolvedSchoolId, permissionKey)),
  );
  return checks.some(Boolean);
}

async function resolveSchoolId(
  request: Request,
  services: SchoolAccessServices,
  schoolId?: number | null,
): Promise<number | null> {
  if (schoolId != null) {
    return schoolId;
  }

  const schools = await services.school.getAll();
  const remembered = await readRememberedSchoolId(request);
  return selectSchoolId(new URL(request.url), schools, remembered);
}
