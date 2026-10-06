import { Link, useLoaderData, useSearchParams } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { SchoolThemeCard } from '~/components/school/SchoolThemeCard';
import { PageHeader } from '~/components/ui/PageHeader';
import { useLanguage } from '~/lib/i18n';
import { selectSchoolId } from '~/lib/selected-school';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import type { SelectSchool } from 'workers/database/school';
import type { ListedSchoolTheme } from 'workers/services/school-themes';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.read');
  await context.services.tenancy.ensureForCurrentOwner();
  const schools: SelectSchool[] = await context.services.school.getAll();
  const schoolId = selectSchoolId(new URL(request.url), schools);
  const themesExtensionEnabled = schoolId
    ? await context.services.extensions.isEnabled(schoolId, 'themes')
    : false;
  const themes: ListedSchoolTheme[] =
    schoolId && themesExtensionEnabled
      ? await context.services.schoolThemes.listForSchool(schoolId)
      : [];

  return {
    schools: schools.map((school) => ({ id: school.id, name: school.name })),
    schoolId,
    themesExtensionEnabled,
    themes,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.update');
  const form = await request.formData();
  const schoolId = Number(form.get('schoolId'));
  const intent = String(form.get('intent') || '');
  const themesEnabled = await context.services.extensions.isEnabled(schoolId, 'themes');

  if (!themesEnabled) {
    return { themeError: 'Install the site themes extension before uploading a theme.' };
  }

  try {
    if (intent === 'upload-theme') {
      const themeFile = form.get('themeFile');
      if (!(themeFile instanceof File) || themeFile.size === 0) {
        return { themeError: 'Choose a theme file.' };
      }
      await context.services.schoolThemes.savePackage(schoolId, await themeFile.text());
      return { themeSuccess: 'uploaded' as const };
    }

    if (intent === 'activate-theme') {
      await context.services.schoolThemes.activate(
        schoolId,
        String(form.get('themeKey') || ''),
      );
      return { themeSuccess: 'activated' as const };
    }

    return { themeError: 'Unknown theme action.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Theme file is not valid.';
    return { themeError: message };
  }
}

export default function ThemesPage() {
  const { schools, schoolId, themesExtensionEnabled, themes } = useLoaderData<typeof loader>();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  return (
    <div className="space-y-6">
      <PageHeader title={t('installThemes')} description={t('installThemesDescription')} />
      {schools.length > 1 ? (
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
                {school.name}
              </Link>
            );
          })}
        </div>
      ) : null}
      {schoolId === null ? (
        <p className="text-sm text-muted-foreground">{t('createSchoolFirst')}</p>
      ) : null}
      {schoolId !== null && !themesExtensionEnabled ? (
        <p className="text-sm">
          {t('installThemesExtensionFirst')}{' '}
          <Link className="underline" to={`/extensions?schoolId=${schoolId}`}>
            {t('installExtensions')}
          </Link>
        </p>
      ) : null}
      {schoolId !== null && themesExtensionEnabled ? (
        <SchoolThemeCard themes={themes} schoolId={schoolId} />
      ) : null}
    </div>
  );
}
