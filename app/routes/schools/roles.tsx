import { useFetcher, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '~/components/ui/PageHeader';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { useLanguage } from '~/lib/i18n';
import { readRememberedSchoolId, selectSchoolId } from '~/lib/selected-school';
import type { SelectSchool } from 'workers/database/school';
import type { SchoolRole } from 'workers/services/access';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await context.services.tenancy.ensureForCurrentOwner();
  const schools: SelectSchool[] = await context.services.school.getAll();
  const remembered = await readRememberedSchoolId(request);
  const schoolId = selectSchoolId(new URL(request.url), schools, remembered);

  if (schoolId === null) {
    return { schoolId: null, roles: [], error: null };
  }

  try {
    const roles: SchoolRole[] = await context.services.access.listRoles(schoolId);
    return { schoolId, roles, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load roles.';
    return { schoolId, roles: [], error: message };
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
    }
    return { saved: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update that role.';
    return { error: message };
  }
}

export default function RolesPage() {
  const { schoolId, roles, error } = useLoaderData<typeof loader>();
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
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
