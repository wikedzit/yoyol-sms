import { Link, useFetcher, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { moduleStatusLabel } from '~/components/modules/ModuleCatalogTable';
import { PageHeader } from '~/components/ui/PageHeader';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { useLanguage, type TranslationKey } from '~/lib/i18n';
import { selectSchoolId } from '~/lib/selected-school';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import type { SelectSchool } from 'workers/database/school';
import { findBundledManifest } from 'workers/kernel/bundled-manifests';
import { appModules } from 'workers/kernel/modules';
import { consentLines } from 'workers/kernel/package-upload';

export { action } from './extensions';

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.read');
  await context.services.tenancy.ensureForCurrentOwner();
  const schools: SelectSchool[] = await context.services.school.getAll();
  const schoolId = selectSchoolId(new URL(request.url), schools);
  const moduleKey = params.moduleKey ?? '';
  const listed = schoolId ? await context.services.extensions.listForSchool(schoolId) : [];
  const module = listed.find((item) => item.type === 'module' && item.key === moduleKey && item.key !== 'themes');
  if (!module || schoolId === null) {
    throw new Response('That module is not available.', { status: 404 });
  }

  const manifest = findBundledManifest(module.key);
  const consent = consentLines({
    capabilities: manifest?.capabilities ?? [],
    outboundHosts: manifest?.outboundHosts ?? [],
  }).filter((line) => line.sensitive);
  const settingFields = (await context.services.settings.list(schoolId)).filter(
    (field) => field.extensionKey === module.key,
  );

  const appModule = appModules.find((item) => item.key === module.key);
  const screens = (appModule?.menu ?? []).map((item) => ({
    labelKey: item.labelKey,
    path: item.path,
  }));

  return {
    schoolId,
    module,
    consent,
    settingFields,
    screens,
    hasPage: (manifest?.pages?.length ?? 0) > 0,
  };
}

export default function ModuleDetailPage() {
  const { schoolId, module, consent, settingFields, screens, hasPage } = useLoaderData<typeof loader>();
  const { language, t } = useLanguage();
  const fetcher = useFetcher<{ error?: string }>();
  const name = language === 'sw' ? module.nameSw : module.nameEn;
  const description = language === 'sw' ? module.descriptionSw : module.descriptionEn;
  const isEnabled = module.status === 'enabled';
  const listPath = `/modules?schoolId=${schoolId}`;

  return (
    <div className="space-y-6">
      <Link className="text-sm underline" to={listPath}>{t('backToModules')}</Link>
      <PageHeader title={name} description={description} />
      {fetcher.data && 'error' in fetcher.data && fetcher.data.error ? (
        <p className="text-sm text-destructive">{fetcher.data.error}</p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{t('extensionStatus')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{t('extensionVersion')}: {module.version}</p>
          <p>{t('extensionStatus')}: {moduleStatusLabel(module, t)}</p>
          <p>
            {t('extensionCapabilities')}: {module.grantedCapabilities.length > 0
              ? module.grantedCapabilities.join(', ')
              : t('extensionNoCapabilities')}
          </p>
          {consent.map((line) => (
            <p key={line.en} className="font-medium">{language === 'sw' ? line.sw : line.en}</p>
          ))}
          {module.installedVersion ? (
            <p>{module.updateAvailable ? t('extensionUpdateAvailable') : t('extensionUpToDate')}</p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-2">
            {isEnabled && !module.required ? (
              <ManageButton fetcher={fetcher} schoolId={schoolId} moduleKey={module.key} intent="disable" label={t('turnOffExtension')} />
            ) : null}
            {(isEnabled || module.status === 'disabled') && !module.required ? (
              <ManageButton fetcher={fetcher} schoolId={schoolId} moduleKey={module.key} intent="remove" label={t('removeExtension')} />
            ) : null}
            {(module.status === 'disabled' || module.status === 'removed') && !module.required ? (
              <ManageButton fetcher={fetcher} schoolId={schoolId} moduleKey={module.key} intent="purge" label={t('purgeExtension')} />
            ) : null}
            {!isEnabled && !module.required ? (
              <ManageButton fetcher={fetcher} schoolId={schoolId} moduleKey={module.key} intent="enable" label={t('installExtension')} outline={false} />
            ) : null}
            {isEnabled && screens.length === 0 && hasPage ? (
              <Button variant="outline" asChild>
                <Link to={withSchool(`/x/${module.key}`, schoolId)}>{t('openModulePage')}</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      {isEnabled && screens.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('moduleScreens')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {screens.map((screen) => (
                <li key={screen.path}>
                  <Link className="underline" to={withSchool(screen.path, schoolId)}>
                    {screenLabel(screen.labelKey, t)}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      {isEnabled && settingFields.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {settingFields.map((field) => (
              <fetcher.Form key={field.key} method="post" className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="intent" value="saveSetting" />
                <input type="hidden" name="schoolId" value={schoolId} />
                <input type="hidden" name="extensionKey" value={module.key} />
                <input type="hidden" name="settingKey" value={field.key} />
                <label className="text-sm text-muted-foreground" htmlFor={`${module.key}-${field.key}`}>
                  {field.key}
                </label>
                <Input
                  id={`${module.key}-${field.key}`}
                  name="settingValue"
                  defaultValue={field.value}
                  key={`${field.key}-${field.value}`}
                  className="max-w-xs"
                />
                <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>
                  {t('saveSetting')}
                </Button>
              </fetcher.Form>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function withSchool(path: string, schoolId: number): string {
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}schoolId=${schoolId}`;
}

function screenLabel(labelKey: string, t: (key: TranslationKey) => string): string {
  const label = t(labelKey as TranslationKey);
  return label || labelKey;
}

function ManageButton({
  fetcher,
  schoolId,
  moduleKey,
  intent,
  label,
  outline = true,
}: {
  fetcher: ReturnType<typeof useFetcher>;
  schoolId: number;
  moduleKey: string;
  intent: string;
  label: string;
  outline?: boolean;
}) {
  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="schoolId" value={schoolId} />
      <input type="hidden" name="extensionKey" value={moduleKey} />
      <Button type="submit" variant={outline ? 'outline' : 'default'} disabled={fetcher.state !== 'idle'}>
        {label}
      </Button>
    </fetcher.Form>
  );
}
