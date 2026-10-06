import { Link, useFetcher, useLoaderData, useSearchParams } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '~/components/ui/PageHeader';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { useLanguage } from '~/lib/i18n';
import { selectSchoolId } from '~/lib/selected-school';
import type { SelectSchool } from 'workers/database/school';
import type { InstalledExtension } from 'workers/services/extensions';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await context.services.tenancy.ensureForCurrentOwner();
  const schools: SelectSchool[] = await context.services.school.getAll();
  const schoolId = selectSchoolId(new URL(request.url), schools);
  const extensions: InstalledExtension[] = schoolId
    ? await context.services.extensions.listForSchool(schoolId)
    : [];

  return {
    schools: schools.map((school) => ({ id: school.id, name: school.name })),
    schoolId,
    extensions,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const schoolId = Number(form.get('schoolId'));
  const extensionKey = String(form.get('extensionKey') || '');

  try {
    await context.services.extensions.install(schoolId, extensionKey);
    return { installed: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to install that extension.';
    return { error: message };
  }
}

export default function ExtensionsPage() {
  const { schools, schoolId, extensions } = useLoaderData<typeof loader>();
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const fetcher = useFetcher<typeof action>();

  return (
    <div className="space-y-6">
      <PageHeader title={t('installExtensions')} description={t('installExtensionsDescription')} />
      <SchoolPicker schools={schools} schoolId={schoolId} searchParams={searchParams} />
      {schoolId === null ? (
        <p className="text-sm text-muted-foreground">{t('createSchoolFirst')}</p>
      ) : (
        <ul className="space-y-3">
          {extensions.map((extension) => {
            const name = language === 'sw' ? extension.nameSw : extension.nameEn;
            const description = language === 'sw' ? extension.descriptionSw : extension.descriptionEn;
            const isInstalled = extension.status === 'enabled';
            return (
              <li key={extension.key}>
                <Card>
                  <CardHeader>
                    <CardTitle>{name}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-3">
                    {isInstalled ? (
                      <p className="text-sm text-muted-foreground">{t('extensionInstalled')}</p>
                    ) : (
                      <fetcher.Form method="post">
                        <input type="hidden" name="schoolId" value={schoolId} />
                        <input type="hidden" name="extensionKey" value={extension.key} />
                        <Button type="submit" disabled={fetcher.state !== 'idle'}>
                          {t('installExtension')}
                        </Button>
                      </fetcher.Form>
                    )}
                    {extension.key === 'themes' && isInstalled ? (
                      <Link className="text-sm underline" to={`/themes?schoolId=${schoolId}`}>
                        {t('openThemes')}
                      </Link>
                    ) : null}
                    {fetcher.data && 'error' in fetcher.data && fetcher.data.error ? (
                      <p className="text-sm text-destructive">{fetcher.data.error}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SchoolPicker({
  schools,
  schoolId,
  searchParams,
}: {
  schools: { id: number; name: string }[];
  schoolId: number | null;
  searchParams: URLSearchParams;
}) {
  const { t } = useLanguage();
  if (schools.length < 2) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {schools.map((school) => {
        const next = new URLSearchParams(searchParams);
        next.set('schoolId', String(school.id));
        const isSelected = school.id === schoolId;
        return (
          <Link
            key={school.id}
            to={`?${next.toString()}`}
            className={
              isSelected
                ? 'rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground'
                : 'rounded-md border px-3 py-1 text-sm'
            }
          >
            {school.name || t('school')}
          </Link>
        );
      })}
    </div>
  );
}
