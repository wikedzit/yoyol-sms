import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import { readRememberedSchoolId, selectSchoolId } from '~/lib/selected-school';
import type { SelectSchool } from 'workers/database/school';
import { scopeAllowsRecord } from 'workers/services/visible-records';

async function schoolFor(request: Request, services: LoaderFunctionArgs['context']['services']) {
  const schools: SelectSchool[] = await services.school.getAll();
  const remembered = await readRememberedSchoolId(request);
  return selectSchoolId(new URL(request.url), schools, remembered);
}

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.read');
  const schoolId = await schoolFor(request, context.services);
  const studentId = Number(params.studentId);
  if (!schoolId || !Number.isInteger(studentId)) {
    throw new Response('That student was not found.', { status: 404 });
  }
  const scope = await context.services.recordScope.forSchool(schoolId);
  if (!scopeAllowsRecord(scope, studentId, (item) => item.studentIds)) {
    throw new Response('That student was not found.', { status: 404 });
  }
  try {
    const exported = await context.services.personData.exportStudent(studentId);
    return new Response(JSON.stringify(exported, null, 2), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="student-${studentId}.json"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'That student was not found.') {
      throw new Response('That student was not found.', { status: 404 });
    }
    throw error;
  }
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.write');
  const schoolId = await schoolFor(request, context.services);
  const studentId = Number(params.studentId);
  if (!schoolId || !Number.isInteger(studentId)) {
    throw new Response('That student was not found.', { status: 404 });
  }
  const scope = await context.services.recordScope.forSchool(schoolId);
  if (!scopeAllowsRecord(scope, studentId, (item) => item.studentIds)) {
    throw new Response('That student was not found.', { status: 404 });
  }
  const form = await request.formData();
  try {
    await context.services.personData.eraseStudent(studentId, form.get('confirm') === 'yes');
  } catch (error) {
    if (error instanceof Error && error.message === 'That student was not found.') {
      throw new Response('That student was not found.', { status: 404 });
    }
    throw error;
  }
  return new Response(null, { status: 303, headers: { Location: '/students' } });
}
