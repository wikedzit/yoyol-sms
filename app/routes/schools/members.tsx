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
    return emptyMembersPage();
  }

  try {
    const members: SchoolMember[] = await context.services.access.listMembers(schoolId);
    const roles: SchoolRole[] = await context.services.access.listRoles(schoolId);
    const guardianLinks: { userId: number; studentId: number }[] =
      await context.services.access.listGuardianLinks(schoolId);
    const teachers: { id: number; firstName: string; lastName: string }[] =
      await context.services.teacher.getAllTeachers({
        limit: 100,
        offset: 0,
        sortBy: 'firstName',
        sortOrder: 'asc',
      });
    const students: { id: number; firstName: string; lastName: string }[] =
      await context.services.student.getAll({
        limit: 100,
        offset: 0,
        sortBy: 'firstName',
        sortOrder: 'asc',
      });
    return { schoolId, members, roles, guardianLinks, teachers, students, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load members.';
    return { ...emptyMembersPage(), schoolId, error: message };
  }
}

function emptyMembersPage() {
  return {
    schoolId: null as number | null,
    members: [] as SchoolMember[],
    roles: [] as SchoolRole[],
    guardianLinks: [] as { userId: number; studentId: number }[],
    teachers: [] as { id: number; firstName: string; lastName: string }[],
    students: [] as { id: number; firstName: string; lastName: string }[],
    error: null as string | null,
  };
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
    } else if (intent === 'link') {
      const roleKey = String(form.get('roleKey') || '');
      if (roleKey === 'parent') {
        const studentIds = String(form.get('studentIds') || '')
          .split(',')
          .map((value) => Number(value))
          .filter((id) => Number.isInteger(id) && id > 0);
        await context.services.access.replaceGuardianStudents(
          schoolId,
          Number(form.get('userId')),
          studentIds,
        );
      } else if (roleKey === 'teacher') {
        const teacherId = Number(form.get('teacherId') || 0) || null;
        await context.services.access.linkMemberRecord(schoolId, membershipId, teacherId, null);
      } else if (roleKey === 'student') {
        const linkedStudentId = Number(form.get('studentId') || 0) || null;
        await context.services.access.linkMemberRecord(schoolId, membershipId, null, linkedStudentId);
      }
    }
    return { saved: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update that member.';
    return { error: message };
  }
}

export default function MembersPage() {
  const { schoolId, members, roles, teachers, students, guardianLinks, error } =
    useLoaderData<typeof loader>();
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
                  <MemberLink
                    member={member}
                    schoolId={schoolId}
                    teachers={teachers}
                    students={students}
                    guardianLinks={guardianLinks}
                  />
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MemberLink({
  member,
  schoolId,
  teachers,
  students,
  guardianLinks,
}: {
  member: SchoolMember;
  schoolId: number | null;
  teachers: { id: number; firstName: string; lastName: string }[];
  students: { id: number; firstName: string; lastName: string }[];
  guardianLinks: { userId: number; studentId: number }[];
}) {
  const { t } = useLanguage();
  const fetcher = useFetcher<{ error?: string }>();
  if (member.roleKey !== 'teacher' && member.roleKey !== 'student' && member.roleKey !== 'parent') {
    return null;
  }

  const linkedStudentIds = guardianLinks
    .filter((link) => link.userId === member.userId)
    .map((link) => link.studentId)
    .join(',');

  return (
    <fetcher.Form method="post" className="flex w-full flex-wrap items-center gap-2">
      <input type="hidden" name="intent" value="link" />
      <input type="hidden" name="roleKey" value={member.roleKey} />
      <input type="hidden" name="schoolId" value={schoolId ?? ''} />
      <input type="hidden" name="membershipId" value={member.membershipId} />
      <input type="hidden" name="userId" value={member.userId} />
      {member.roleKey === 'teacher' ? (
        <select
          name="teacherId"
          defaultValue={member.teacherId ?? ''}
          aria-label={t('linkedTeacher')}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="">{t('noLinkedRecord')}</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {[teacher.firstName, teacher.lastName].filter(Boolean).join(' ')}
            </option>
          ))}
        </select>
      ) : null}
      {member.roleKey === 'student' ? (
        <select
          name="studentId"
          defaultValue={member.studentId ?? ''}
          aria-label={t('linkedStudent')}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="">{t('noLinkedRecord')}</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {[student.firstName, student.lastName].filter(Boolean).join(' ')}
            </option>
          ))}
        </select>
      ) : null}
      {member.roleKey === 'parent' ? (
        <input
          name="studentIds"
          defaultValue={linkedStudentIds}
          aria-label={t('linkedStudents')}
          placeholder={t('linkedStudents')}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        />
      ) : null}
      <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>
        {t('saveLink')}
      </Button>
      {fetcher.data?.error ? <p className="text-sm text-destructive">{fetcher.data.error}</p> : null}
    </fetcher.Form>
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
