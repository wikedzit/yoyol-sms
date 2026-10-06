import { redirect, type ActionFunctionArgs } from 'react-router';

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const schoolId = Number(form.get('schoolId'));
  const intent = String(form.get('intent') || '');
  const status = intent === 'restore' ? 'active' : 'archived';

  try {
    await context.services.tenancy.ensureForCurrentOwner();
    await context.services.access.setSchoolStatus(schoolId, status);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update the school.';
    return { error: message };
  }

  return redirect('/schools/profile');
}
