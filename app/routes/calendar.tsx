import { Form, redirect, useActionData, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '~/components/ui/button';
import { PageFrame } from '~/components/ui/PageFrame';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { useLanguage } from '~/lib/i18n';
import { requireSchoolPermission, selectedSchoolId } from '~/lib/require-school-permission';

const eventTypes = ['exam', 'holiday', 'meeting', 'fee', 'other'] as const;

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.read');
  const schoolId = await selectedSchoolId(request, context.services);
  const [events, years] = await Promise.all([
    context.services.calendar.list(),
    context.services.calendar.years(),
  ]);
  const canWrite = schoolId != null && await context.services.access.can(schoolId, 'students.record.write');
  return { events, years, canWrite };
}

export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.write');
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const result = intent === 'cancel'
    ? await context.services.calendar.cancel(Number(form.get('eventId')))
    : await context.services.calendar.create({
      title: String(form.get('title') ?? ''),
      description: String(form.get('description') ?? ''),
      eventDate: String(form.get('eventDate') ?? ''),
      eventType: String(form.get('eventType') ?? 'other'),
      academicYearId: Number(form.get('yearId')) || null,
      attachment: String(form.get('attachment') ?? ''),
      notifyParents: form.get('notifyParents') === 'yes',
    });
  if ('error' in result) return result;
  return redirect('/calendar');
}

export default function CalendarPage() {
  const { events, years, canWrite } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const { t } = useLanguage();

  return (
    <PageFrame title={t('schoolCalendar')} description={t('schoolCalendarDescription')}>
      {result && 'error' in result ? <p className="text-sm text-destructive">{result.error}</p> : null}
      {events.length === 0 ? <p className="text-sm">{t('noEvents')}</p> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{t('eventDate')}</TableHead>
                <TableHead className="font-semibold">{t('name')}</TableHead>
                <TableHead className="font-semibold">{t('eventType')}</TableHead>
                <TableHead className="font-semibold">{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.eventDate}</TableCell>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>{event.eventType}</TableCell>
                  <TableCell>{event.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {canWrite ? (
        <>
          <Form method="post" className="grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="intent" value="create" />
            <input name="title" required aria-label={t('addEvent')} className="h-9 rounded-md border px-3 text-sm" />
            <input name="eventDate" type="date" required aria-label={t('eventDate')} className="h-9 rounded-md border px-3 text-sm" />
            <select name="eventType" aria-label={t('eventType')} className="h-9 rounded-md border px-3 text-sm">
              {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select name="yearId" aria-label={t('academicYear')} className="h-9 rounded-md border px-3 text-sm">
              {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
            <input name="description" aria-label={t('schoolCalendarDescription')} className="h-9 rounded-md border px-3 text-sm" />
            <input name="attachment" aria-label={t('attachmentNote')} placeholder={t('attachmentNote')} className="h-9 rounded-md border px-3 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="notifyParents" value="yes" />
              {t('notifyParents')}
            </label>
            <Button type="submit">{t('addEvent')}</Button>
          </Form>
          <Form method="post" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="intent" value="cancel" />
            <select name="eventId" required aria-label={t('cancelEvent')} className="h-9 rounded-md border px-3 text-sm">
              {events.filter((event) => event.status === 'scheduled').map((event) => (
                <option key={event.id} value={event.id}>{event.line}</option>
              ))}
            </select>
            <Button type="submit" variant="outline">{t('cancelEvent')}</Button>
          </Form>
        </>
      ) : null}
    </PageFrame>
  );
}
