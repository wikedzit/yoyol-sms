import { Form, useActionData, useLoaderData, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { PageHeader } from '~/components/ui/PageHeader';
import { Button } from '~/components/ui/button';
import { accessCookie } from 'workers/utils/cookies.server';
import { useLanguage } from '~/lib/i18n';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import { readRememberedSchoolId, selectSchoolId } from '~/lib/selected-school';
import type { SelectSchool } from 'workers/database/school';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const token = await accessCookie.parse(request.headers.get('Cookie') || '');
  if (typeof token !== 'string') return redirect('/auth/login');
  const payload = jwt.decode(token).payload as { id?: number; email?: string };
  if (typeof payload.id !== 'number' || !payload.email) return redirect('/auth/login');

  const user = await context.services.users.findUserById(payload.id);
  const schools: SelectSchool[] = await context.services.school.getAll();
  const remembered = await readRememberedSchoolId(request);
  const schoolId = selectSchoolId(new URL(request.url), schools, remembered);
  const school = schools.find((item) => item.id === schoolId) ?? null;
  return {
    email: payload.email,
    totpEnabled: user?.totpEnabled === 1,
    schoolId,
    requirePrivilegedTotp: school?.requirePrivilegedTotp === 1,
    secret: null as string | null,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const token = await accessCookie.parse(request.headers.get('Cookie') || '');
  if (typeof token !== 'string') return redirect('/auth/login');
  const payload = jwt.decode(token).payload as { id?: number };
  if (typeof payload.id !== 'number') return redirect('/auth/login');

  const form = await request.formData();
  const intent = String(form.get('intent') || '');

  if (intent === 'begin') {
    const secret = await context.services.users.beginTotp(payload.id);
    return { secret };
  }

  if (intent === 'confirm') {
    const confirmed = await context.services.users.confirmTotp(payload.id, String(form.get('code') || ''));
    if (!confirmed) return { error: 'That code is not valid.' };
    await context.services.sessions.recordAudit({
      action: 'totp_enabled',
      userId: payload.id,
    });
    return { enabled: true };
  }

  if (intent === 'policy') {
    await requireSchoolPermission(request, context.services, 'school.profile.update');
    const schoolId = Number(form.get('schoolId'));
    await context.services.users.setSchoolTotpPolicy(schoolId, form.get('required') === '1');
    return { saved: true };
  }

  return { error: 'Unknown action.' };
}

export default function SecurityPage() {
  const { t } = useLanguage();
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const secret = actionData && 'secret' in actionData ? actionData.secret : null;

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader title={t('accountSecurity')} description={data.email} />
      <p>{data.totpEnabled ? t('totpOn') : t('totpOff')}</p>
      <Form method="post">
        <input type="hidden" name="intent" value="begin" />
        <Button type="submit">{t('startTotp')}</Button>
      </Form>
      {secret && (
        <Form method="post" className="space-y-3">
          <p className="text-sm">{t('totpSecretHint')}</p>
          <p className="font-mono text-sm break-all">{secret}</p>
          <input type="hidden" name="intent" value="confirm" />
          <input name="code" inputMode="numeric" placeholder="123456" className="border rounded-md px-3 py-2" />
          <Button type="submit">{t('confirmTotp')}</Button>
        </Form>
      )}
      {actionData && 'error' in actionData && <p className="text-sm text-destructive">{actionData.error}</p>}
      {data.schoolId !== null && (
        <Form method="post" className="space-y-3">
          <input type="hidden" name="intent" value="policy" />
          <input type="hidden" name="schoolId" value={data.schoolId} />
          <input type="hidden" name="required" value={data.requirePrivilegedTotp ? '0' : '1'} />
          <Button type="submit" variant="outline">
            {data.requirePrivilegedTotp ? t('totpPolicyOff') : t('totpPolicyOn')}
          </Button>
        </Form>
      )}
      <Form method="post" action="/logout">
        <input type="hidden" name="everywhere" value="1" />
        <Button type="submit" variant="outline">{t('signOutEverywhere')}</Button>
      </Form>
    </div>
  );
}
