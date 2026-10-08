import { useFetcher, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { PageFrame } from '~/components/ui/PageFrame';
import { Button } from '~/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
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
    <PageFrame title={t('inbox')} description={t('inboxDescription')}>
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('inboxEmpty')}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{t('messageTitle')}</TableHead>
                <TableHead className="font-semibold">{t('messageBody')}</TableHead>
                <TableHead className="font-semibold">{t('eventDate')}</TableHead>
                <TableHead className="font-semibold">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="font-medium">{message.title}</TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">{message.body}</TableCell>
                  <TableCell>{new Date(message.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    {message.readAt === null && schoolId !== null ? (
                      <fetcher.Form method="post">
                        <input type="hidden" name="schoolId" value={schoolId} />
                        <input type="hidden" name="notificationId" value={message.id} />
                        <Button type="submit" size="sm" variant="outline" disabled={fetcher.state !== 'idle'}>
                          {t('markRead')}
                        </Button>
                      </fetcher.Form>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageFrame>
  );
}
