import type { LoaderFunctionArgs } from 'react-router';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import { readRememberedSchoolId, selectSchoolId } from '~/lib/selected-school';
import type { SelectSchool } from 'workers/database/school';

const fileNames: Record<string, string> = {
  students: 'students.csv',
  staff: 'staff.csv',
  fees: 'fees.csv',
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.write');
  const schools: SelectSchool[] = await context.services.school.getAll();
  const url = new URL(request.url);
  const remembered = await readRememberedSchoolId(request);
  const schoolId = selectSchoolId(url, schools, remembered);
  const kind = url.pathname.split('/').at(-1)?.replace('.csv', '') ?? '';
  const csv = schoolId ? await context.services.reports.exportCsv(kind) : '';
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${fileNames[kind] ?? 'report.csv'}"`,
    },
  });
}
