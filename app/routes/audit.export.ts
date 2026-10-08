import type { LoaderFunctionArgs } from 'react-router';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import { readRememberedSchoolId, selectSchoolId } from '~/lib/selected-school';
import type { SelectSchool } from 'workers/database/school';
import { auditCsv } from 'workers/kernel/audit-export';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.read');
  const schools: SelectSchool[] = await context.services.school.getAll();
  const url = new URL(request.url);
  const remembered = await readRememberedSchoolId(request);
  const schoolId = selectSchoolId(url, schools, remembered);
  const query = url.searchParams.get('q') ?? '';
  const entries = schoolId
    ? await context.services.audit.listForSchool(schoolId, query)
    : [];
  return new Response(auditCsv(entries), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="audit.csv"',
    },
  });
}
