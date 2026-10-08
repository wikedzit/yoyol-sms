import { useFetcher, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '~/components/ui/PageHeader';
import { Button } from '~/components/ui/button';
import { useLanguage } from '~/lib/i18n';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import { readRememberedSchoolId, selectSchoolId } from '~/lib/selected-school';
import type { SelectSchool } from 'workers/database/school';
import type { InboxMessage } from 'workers/services/notifications';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.read');
  const userId = context.services.currentUserId;
  const schools: SelectSchool[] = await context.services.school.getAll();
  const remembered = await readRememberedSchoolId(request);
  const schoolId = selectSchoolId(new URL(request.url), schools, remembered);
  const messages: InboxMessage[] = schoolId && userId
    ? await context.services.notifications.listForUser(schoolId, userId)
    : [];
  return { schoolId, messages };
}

export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.read');
  const form = await request.formData();
  const schoolId = Number(form.get('schoolId'));
  const userId = context.services.currentUserId;
  if (!userId) {
    return { error: 'Sign in again.' };
  }
  await context.services.notifications.markRead(schoolId, userId, Number(form.get('notificationId')));
  return { read: true };
}

export default function InboxPage() {
  const { schoolId, messages } = useLoaderData<typeof loader>();
  const { t } = useLanguage();
  const fetcher = useFetcher<typeof action>();

  return (
    <div className="space-y-6">
      <PageHeader title={t('inbox')} description={t('inboxDescription')} />
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('inboxEmpty')}</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li key={message.id} className="rounded-md border p-4 space-y-2">
              <p className="font-medium">{message.title}</p>
              <p className="text-sm text-muted-foreground">{message.body}</p>
              {message.readAt === null && schoolId !== null ? (
                <fetcher.Form method="post">
                  <input type="hidden" name="schoolId" value={schoolId} />
                  <input type="hidden" name="notificationId" value={message.id} />
                  <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>
                    {t('markRead')}
                  </Button>
                </fetcher.Form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
