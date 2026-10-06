import { selectedSchoolId } from '~/lib/require-school-permission';
import {
  scopeAllowsRecord,
  type RecordScope,
} from 'workers/services/visible-records';

type ScopeServices = Parameters<typeof selectedSchoolId>[1] & {
  recordScope: { forSchool: (schoolId: number) => Promise<RecordScope> };
};

export async function loadRecordScope(
  request: Request,
  services: ScopeServices,
): Promise<RecordScope> {
  const schoolId = await selectedSchoolId(request, services);
  if (schoolId == null) {
    return { kind: 'school' };
  }
  return services.recordScope.forSchool(schoolId);
}

export function refuseOutsideScope(
  scope: RecordScope,
  recordId: number | null,
  allowedIds: (scope: Extract<RecordScope, { kind: 'limited' }>) => number[],
): void {
  if (scopeAllowsRecord(scope, recordId, allowedIds)) {
    return;
  }
  throw new Response('You do not have permission to do that.', { status: 403 });
}
