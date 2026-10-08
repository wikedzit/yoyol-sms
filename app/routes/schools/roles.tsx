import { useFetcher, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '~/components/ui/PageHeader';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { useLanguage } from '~/lib/i18n';
import { readRememberedSchoolId, selectSchoolId } from '~/lib/selected-school';
import type { SelectSchool } from 'workers/database/school';
import { appModules } from 'workers/kernel/modules';
import type { SchoolRole } from 'workers/services/access';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await context.services.tenancy.ensureForCurrentOwner();
  const schools: SelectSchool[] = await context.services.school.getAll();
  const remembered = await readRememberedSchoolId(request);
  const schoolId = selectSchoolId(new URL(request.url), schools, remembered);

  if (schoolId === null) {
    return { schoolId: null, roles: [], grants: [], error: null };
  }

  try {
    const roles: SchoolRole[] = await context.services.access.listRoles(schoolId);
    const grants: { roleId: number; permissionKey: string }[] =
      await context.services.access.listGrants(schoolId);
    return { schoolId, roles, grants, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load roles.';
    return { schoolId, roles: [], grants: [], error: message };
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const schoolId = Number(form.get('schoolId'));
  const intent = String(form.get('intent') || '');

  try {
    if (intent === 'create') {
      await context.services.access.createRole(schoolId, String(form.get('name') || ''));
    } else if (intent === 'rename') {
      await context.services.access.renameRole(
        schoolId,
        Number(form.get('roleId')),
        String(form.get('name') || ''),
      );
    } else if (intent === 'delete') {
      await context.services.access.deleteRole(schoolId, Number(form.get('roleId')));
    } else if (intent === 'grant') {
      await context.services.access.setRoleGrant(
        schoolId,
        Number(form.get('roleId')),
        String(form.get('permissionKey') || ''),
        form.get('enabled') === '1',
      );
    }
    return { saved: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update that role.';
    return { error: message };
  }
}

export default function RolesPage() {
  const { schoolId, roles, grants, error } = useLoaderData<typeof loader>();
  const { t } = useLanguage();
  const fetcher = useFetcher<typeof action>();
  const actionError = fetcher.data && 'error' in fetcher.data ? fetcher.data.error : null;

  return (
    <div className="space-y-6">
      <PageHeader title={t('schoolRoles')} description={t('schoolRolesDescription')} />
      {schoolId === null ? (
        <p className="text-sm text-muted-foreground">{t('createSchoolFirst')}</p>
      ) : (
        <fetcher.Form method="post" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="intent" value="create" />
          <input type="hidden" name="schoolId" value={schoolId} />
          <input
            name="name"
            required
            placeholder={t('roleName')}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          />
          <Button type="submit" disabled={fetcher.state !== 'idle'}>
            {t('createRole')}
          </Button>
        </fetcher.Form>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
      <ul className="space-y-3">
        {roles.map((role) => (
          <li key={role.id}>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{role.name}</p>
                  {role.isSystem ? (
                    <p className="text-sm text-muted-foreground">{t('builtInRole')}</p>
                  ) : null}
                  {role.key === 'admin' ? (
                    <p className="text-sm text-muted-foreground">{t('adminKeepsPermissions')}</p>
                  ) : null}
                </div>
                {role.isSystem ? null : (
                  <div className="flex flex-wrap items-center gap-2">
                    <fetcher.Form method="post" className="flex items-center gap-2">
                      <input type="hidden" name="intent" value="rename" />
                      <input type="hidden" name="schoolId" value={schoolId ?? ''} />
                      <input type="hidden" name="roleId" value={role.id} />
                      <input
                        name="name"
                        defaultValue={role.name}
                        className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                        aria-label={t('renameRole')}
                      />
                      <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>
                        {t('renameRole')}
                      </Button>
                    </fetcher.Form>
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="schoolId" value={schoolId ?? ''} />
                      <input type="hidden" name="roleId" value={role.id} />
                      <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>
                        {t('deleteRole')}
                      </Button>
                    </fetcher.Form>
                  </div>
                )}
              </CardContent>
              <RoleGrants role={role} schoolId={schoolId} grants={grants} />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoleGrants({
  role,
  schoolId,
  grants,
}: {
  role: SchoolRole;
  schoolId: number | null;
  grants: { roleId: number; permissionKey: string }[];
}) {
  const { language } = useLanguage();
  const fetcher = useFetcher<{ error?: string }>();
  const adminRole = role.key === 'admin';
  const modulesWithPermissions = appModules.filter((module) => module.permissions.length > 0);

  return (
    <div className="space-y-3 px-4 pb-4">
      {modulesWithPermissions.map((module) => (
        <div key={module.key}>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {module.name[language]}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {module.permissions.map((permission) => {
              const granted = adminRole || grants.some(
                (grant) => grant.roleId === role.id && grant.permissionKey === permission.key,
              );
              return (
                <label key={permission.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={granted}
                    disabled={adminRole || fetcher.state !== 'idle'}
                    onChange={(event) => {
                      const form = new FormData();
                      form.set('intent', 'grant');
                      form.set('schoolId', String(schoolId ?? ''));
                      form.set('roleId', String(role.id));
                      form.set('permissionKey', permission.key);
                      form.set('enabled', event.target.checked ? '1' : '0');
                      fetcher.submit(form, { method: 'post' });
                    }}
                  />
                  {permission.label[language]}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {fetcher.data?.error ? (
        <p className="w-full text-sm text-destructive">{fetcher.data.error}</p>
      ) : null}
    </div>
  );
}
