import type { ActionFunctionArgs } from 'react-router';
import { requireSchoolPermission } from '~/lib/require-school-permission';

export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.update');
  const removed = await context.services.retention.purgeOldNotifications();
  return new Response(null, {
    status: 303,
    headers: { Location: `/audit?purged=${removed}` },
  });
}
