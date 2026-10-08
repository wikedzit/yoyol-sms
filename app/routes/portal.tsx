import { Form, useActionData, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { ViewDocumentView } from '~/components/ViewDocumentView';
import { Button } from '~/components/ui/button';
import { PageFrame } from '~/components/ui/PageFrame';
import { useLanguage } from '~/lib/i18n';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import { readRememberedSchoolId, selectSchoolId } from '~/lib/selected-school';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.read');
  const schools = await context.services.school.getAll();
  const rememberedId = await readRememberedSchoolId(request);
  const schoolId = selectSchoolId(new URL(request.url), schools, rememberedId);
  const studentId = await context.services.portal.linkedStudentId();
  const portal = await context.services.portal.portal(studentId);
  const studentName = 'lines' in portal && portal.lines[0]
    ? portal.lines[0].split(',')[0] ?? null
    : null;
  if (schoolId != null) {
    try {
      await context.services.extensions.enable(schoolId, 'assessment');
      await context.services.extensions.enable(schoolId, 'attendance');
      await context.services.extensions.enable(schoolId, 'finance');
      await context.services.extensions.enable(schoolId, 'timetable');
    } catch {
      // A profile tab still appears when the hook is already registered.
    }
  }
  const tabs = schoolId == null
    ? []
    : await context.services.extensions.runSchoolSlot(schoolId, 'student.profile.tabs', { studentId, studentName });
  const canInvite = schoolId
    ? await context.services.access.can(schoolId, 'students.record.write')
    : false;
  const choices = canInvite && studentId == null ? await context.services.portal.inviteChoices() : [];
  return {
    lines: 'lines' in portal ? portal.lines : [],
    message: 'error' in portal ? portal.error : null,
    tabs: tabs.flatMap((tab) => (tab.kind === 'document' ? [tab] : [])),
    choices,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.write');
  const form = await request.formData();
  const prepared = await context.services.portal.prepareInvite(Number(form.get('studentId')));
  if ('error' in prepared) return prepared;
  const created = await context.services.invitations.create({
    schoolId: prepared.schoolId,
    email: prepared.email,
    roleId: prepared.roleId,
    studentId: Number(form.get('studentId')),
  });
  return { acceptPath: `/auth/invite?token=${created.token}` };
}

export default function StudentPortalPage() {
  const { lines, message, tabs, choices } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const { t, language } = useLanguage();
  const appLanguage = language === 'sw' ? 'sw' : 'en';

  return (
    <PageFrame title={t('myProfile')} description={t('myProfileDescription')}>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {result && 'error' in result ? <p className="text-sm text-destructive">{result.error}</p> : null}
      {result && 'acceptPath' in result ? (
        <p className="text-sm">{t('invitationLink')}: <a className="underline" href={result.acceptPath}>{result.acceptPath}</a></p>
      ) : null}
      {choices.length > 0 ? (
        <Form method="post" className="flex flex-wrap items-center gap-2">
          <select name="studentId" required aria-label={t('studentsList')} className="h-9 rounded-md border px-3 text-sm">
            {choices.map((student) => (
              <option key={student.id} value={student.id}>{student.name}</option>
            ))}
          </select>
          <Button type="submit">{t('inviteStudent')}</Button>
        </Form>
      ) : null}
      <ul className="space-y-2 text-sm">
        {lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
      {tabs.map((tab) => {
        const catalog = tab.catalog[appLanguage];
        const title = tab.label ? catalog[tab.label] ?? tab.catalog.en[tab.label] ?? tab.label : '';
        return (
          <section key={tab.extensionKey} className="space-y-2 border-t pt-4">
            {title ? <h2 className="text-sm font-semibold">{title}</h2> : null}
            <ViewDocumentView document={tab.document} catalog={tab.catalog} language={appLanguage} />
          </section>
        );
      })}
    </PageFrame>
  );
}
