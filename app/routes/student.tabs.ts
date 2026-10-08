import type { LoaderFunctionArgs } from 'react-router';
import { loadRecordScope, refuseOutsideScope } from '~/lib/load-record-scope';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import { readRememberedSchoolId, selectSchoolId } from '~/lib/selected-school';
import type { SchoolSlot } from 'workers/services/extensions';

const profileModules = ['assessment', 'attendance', 'finance', 'timetable'];

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.read');
  const studentId = Number(params.studentId);
  const scope = await loadRecordScope(request, context.services);
  refuseOutsideScope(scope, studentId, (limited) => limited.studentIds);

  const schools = await context.services.school.getAll();
  const rememberedId = await readRememberedSchoolId(request);
  const schoolId = selectSchoolId(new URL(request.url), schools, rememberedId);
  const student = Number.isInteger(studentId) && studentId > 0
    ? await context.services.student.getById(String(studentId))
    : null;
  const studentName = student
    ? [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ')
    : null;

  if (schoolId == null || !student) {
    return { studentId, profileTabs: [] };
  }

  for (const moduleKey of profileModules) {
    try {
      await context.services.extensions.enable(schoolId, moduleKey);
    } catch {
      // A tab still loads when that module is already enabled.
    }
  }

  try {
    const slots = await context.services.extensions.runSchoolSlot(
      schoolId,
      'student.profile.tabs',
      { studentId, studentName },
    );
    return {
      studentId,
      profileTabs: slots.flatMap((slot: SchoolSlot) => (slot.kind === 'document' ? [slot] : [])),
    };
  } catch (error) {
    console.error('Unable to load student profile tabs:', error);
    return { studentId, profileTabs: [] };
  }
}
