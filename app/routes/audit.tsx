import { Form, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { Button } from '~/components/ui/button';
import { PageHeader } from '~/components/ui/PageHeader';
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{t('auditAction')}</TableHead>
                <TableHead className="font-semibold">{t('auditTarget')}</TableHead>
                <TableHead className="font-semibold">{t('messageBody')}</TableHead>
                <TableHead className="font-semibold">{t('eventDate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.action}</TableCell>
                  <TableCell>
                    {[entry.extensionKey, entry.target].filter(Boolean).join(' / ')}
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">{entry.detail}</TableCell>
                  <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
