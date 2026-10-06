import { redirect, type ActionFunctionArgs } from 'react-router';
import type { SelectSchool } from 'workers/database/school';
import { schoolCookie } from 'workers/utils/cookies.server';

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const schoolId = Number(form.get('schoolId'));
  const returnTo = String(form.get('returnTo') || '/');
  const schools: SelectSchool[] = await context.services.school.getAll();
  const chosen = schools.find(
    (school) => school.id === schoolId && school.status !== 'archived',
  );
  const safePath = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';

  if (!chosen) {
    return redirect(safePath);
  }

  return redirect(safePath, {
    headers: {
      'Set-Cookie': await schoolCookie.serialize(String(chosen.id)),
    },
  });
}
