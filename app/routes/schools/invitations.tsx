import { Form, useActionData, useLoaderData } from 'react-router';
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
import type { SchoolRole } from 'workers/services/access';
import type { ListedInvitation } from 'workers/services/invitations';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.member.manage');
  await context.services.tenancy.ensureForCurrentOwner();
  const schools: SelectSchool[] = await context.services.school.getAll();
  const remembered = await readRememberedSchoolId(request);
  const schoolId = selectSchoolId(new URL(request.url), schools, remembered);
  if (schoolId === null) {
    return { schoolId: null, roles: [] as SchoolRole[], invitations: [] as ListedInvitation[], acceptPath: null as string | null };
  }

  const roles: SchoolRole[] = await context.services.access.listRoles(schoolId);
  const invitations = await context.services.invitations.listForSchool(schoolId);
  return { schoolId, roles, invitations, acceptPath: null as string | null };
}

export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.member.manage');
  const form = await request.formData();
  const schoolId = Number(form.get('schoolId'));
  const roleId = Number(form.get('roleId'));
  try {
    const created = await context.services.invitations.create({
      schoolId,
      roleId,
      email: String(form.get('email') || ''),
      phone: String(form.get('phone') || ''),
    });
    await context.services.sessions.recordAudit({
      action: 'invitation_created',
      schoolId,
      detail: String(form.get('email') || form.get('phone') || ''),
    });
    return { acceptPath: `/auth/invite?token=${created.token}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create the invitation.';
    return { error: message };
  }
}

export default function InvitationsPage() {
  const { t } = useLanguage();
  const { schoolId, roles, invitations } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <PageFrame title={t('invitations')} description={t('invitationsDescription')}>
      {schoolId === null ? <p>{t('createSchoolFirst')}</p> : (
        <>
          <Form method="post" className="grid gap-3 max-w-xl">
            <input type="hidden" name="schoolId" value={schoolId} />
            <input name="email" type="email" placeholder={t('inviteEmail')} className="border rounded-md px-3 py-2" />
            <input name="phone" placeholder={t('invitePhone')} className="border rounded-md px-3 py-2" />
            <select name="roleId" className="border rounded-md px-3 py-2">
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            <Button type="submit">{t('sendInvitation')}</Button>
          </Form>
          {actionData && 'acceptPath' in actionData && actionData.acceptPath && (
            <p className="text-sm">
              {t('invitationLink')}: <a className="underline" href={actionData.acceptPath}>{actionData.acceptPath}</a>
            </p>
          )}
          {actionData && 'error' in actionData && <p className="text-sm text-destructive">{actionData.error}</p>}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">{t('email')}</TableHead>
                  <TableHead className="font-semibold">{t('phone')}</TableHead>
                  <TableHead className="font-semibold">{t('roleName')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation: ListedInvitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>{invitation.phone}</TableCell>
                    <TableCell>{invitation.roleName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </PageFrame>
  );
}
