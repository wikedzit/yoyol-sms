import { Form, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { Button } from '~/components/ui/button';
import { PageHeader } from '~/components/ui/PageHeader';
import { useLanguage } from '~/lib/i18n';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import { readRememberedSchoolId, selectSchoolId } from '~/lib/selected-school';
import type { SelectSchool } from 'workers/database/school';
import type { AuditEntry } from 'workers/services/audit';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.read');
  const schools: SelectSchool[] = await context.services.school.getAll();
  const url = new URL(request.url);
  const remembered = await readRememberedSchoolId(request);
  const schoolId = selectSchoolId(url, schools, remembered);
  const query = url.searchParams.get('q') ?? '';
  const entries: AuditEntry[] = schoolId
    ? await context.services.audit.listForSchool(schoolId, query)
    : [];
  return { entries, query, schoolId };
}

export default function AuditPage() {
  const { entries, query, schoolId } = useLoaderData<typeof loader>();
  const { t } = useLanguage();
  const exportQuery = new URLSearchParams({ q: query });
  if (schoolId) {
    exportQuery.set('schoolId', String(schoolId));
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('auditLog')} description={t('auditDescription')} />
      <Form method="get" className="flex flex-wrap items-center gap-2">
        {schoolId ? <input type="hidden" name="schoolId" value={schoolId} /> : null}
        <input
          name="q"
          defaultValue={query}
          className="h-9 rounded-md border px-3 text-sm"
          aria-label={t('auditSearch')}
        />
        <Button type="submit" variant="outline">{t('auditSearch')}</Button>
        <a className="text-sm underline" href={`/audit.csv?${exportQuery.toString()}`}>{t('auditExport')}</a>
      </Form>
      <Form method="post" action="/retention/run">
        <Button type="submit" variant="outline">{t('purgeOldMessages')}</Button>
      </Form>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('auditEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{entry.action}</p>
              <p className="text-muted-foreground">
                {[entry.extensionKey, entry.target].filter(Boolean).join(' / ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
