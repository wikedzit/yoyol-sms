import { useFetcher, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '~/components/ui/PageHeader';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { useLanguage } from '~/lib/i18n';
import { readRememberedSchoolId, selectSchoolId } from '~/lib/selected-school';
import type { SelectSchool } from 'workers/database/school';
import type { SchoolMember, SchoolRole } from 'workers/services/access';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await context.services.tenancy.ensureForCurrentOwner();
  const schools: SelectSchool[] = await context.services.school.getAll();
  const remembered = await readRememberedSchoolId(request);
  const schoolId = selectSchoolId(new URL(request.url), schools, remembered);

  if (schoolId === null) {
    return { schoolId: null, members: [], roles: [], error: null };
  }

  try {
    const members: SchoolMember[] = await context.services.access.listMembers(schoolId);
    const roles: SchoolRole[] = await context.services.access.listRoles(schoolId);
    return { schoolId, members, roles, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load members.';
    return { schoolId, members: [], roles: [], error: message };
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const schoolId = Number(form.get('schoolId'));
  const membershipId = Number(form.get('membershipId'));
  const intent = String(form.get('intent') || '');

  try {
    if (intent === 'role') {
      await context.services.access.changeMemberRole(
        schoolId,
        membershipId,
        Number(form.get('roleId')),
      );
    } else if (intent === 'suspend') {
      await context.services.access.setMembershipStatus(schoolId, membershipId, 'suspended');
    } else if (intent === 'restore') {
      await context.services.access.setMembershipStatus(schoolId, membershipId, 'active');
    } else if (intent === 'remove') {
      await context.services.access.removeMembership(schoolId, membershipId);
    }
    return { saved: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update that member.';
    return { error: message };
  }
}

export default function MembersPage() {
  const { schoolId, members, roles, error } = useLoaderData<typeof loader>();
  const { t } = useLanguage();
  const fetcher = useFetcher<typeof action>();
  const actionError = fetcher.data && 'error' in fetcher.data ? fetcher.data.error : null;

  return (
    <div className="space-y-6">
      <PageHeader title={t('schoolMembers')} description={t('schoolMembersDescription')} />
      {schoolId === null ? (
        <p className="text-sm text-muted-foreground">{t('createSchoolFirst')}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
      <ul className="space-y-3">
        {members.map((member) => {
          const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email;
          return (
            <li key={member.membershipId}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <p className="text-sm text-muted-foreground">{member.status}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <fetcher.Form method="post" className="flex items-center gap-2">
                      <input type="hidden" name="intent" value="role" />
                      <input type="hidden" name="schoolId" value={schoolId ?? ''} />
                      <input type="hidden" name="membershipId" value={member.membershipId} />
                      <select
                        name="roleId"
                        defaultValue={member.roleId}
                        className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                        aria-label={t('changeRole')}
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>
                        {t('changeRole')}
                      </Button>
                    </fetcher.Form>
                    {member.status === 'active' ? (
                      <MemberAction
                        intent="suspend"
                        label={t('suspendMember')}
                        schoolId={schoolId}
                        membershipId={member.membershipId}
                      />
                    ) : (
                      <MemberAction
                        intent="restore"
                        label={t('restoreMember')}
                        schoolId={schoolId}
                        membershipId={member.membershipId}
                      />
                    )}
                    <MemberAction
                      intent="remove"
                      label={t('removeMember')}
                      schoolId={schoolId}
                      membershipId={member.membershipId}
                    />
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MemberAction({
  intent,
  label,
  schoolId,
  membershipId,
}: {
  intent: string;
  label: string;
  schoolId: number | null;
  membershipId: number;
}) {
  const fetcher = useFetcher<{ error?: string }>();
  const message = fetcher.data?.error;
  return (
    <fetcher.Form method="post" className="flex items-center gap-2">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="schoolId" value={schoolId ?? ''} />
      <input type="hidden" name="membershipId" value={membershipId} />
      <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>
        {label}
      </Button>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </fetcher.Form>
  );
}
