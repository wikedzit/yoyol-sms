import { Link, useFetcher, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { moduleStatusLabel } from '~/components/modules/ModuleCatalogTable';
import { PageFrame } from '~/components/ui/PageFrame';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { useLanguage } from '~/lib/i18n';
import { selectSchoolId } from '~/lib/selected-school';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import type { SelectSchool } from 'workers/database/school';
import { findBundledManifest } from 'workers/kernel/bundled-manifests';
import { consentLines } from 'workers/kernel/package-upload';

export { action } from './extensions';

export async function loader({ request, params, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.read');
  await context.services.tenancy.ensureForCurrentOwner();
  const schools: SelectSchool[] = await context.services.school.getAll();
  const schoolId = selectSchoolId(new URL(request.url), schools);
  const pluginKey = params.pluginKey ?? '';
  const listed = schoolId ? await context.services.extensions.listForSchool(schoolId) : [];
  const plugin = listed.find((item) => item.type === 'plugin' && item.key === pluginKey);
  if (!plugin || schoolId === null) {
    throw new Response('That plugin is not available.', { status: 404 });
  }

  const manifest = findBundledManifest(plugin.key);
  const consent = consentLines({
    capabilities: manifest?.capabilities ?? [],
    outboundHosts: manifest?.outboundHosts ?? [],
  }).filter((line) => line.sensitive);
  const settingFields = (await context.services.settings.list(schoolId)).filter(
    (field) => field.extensionKey === plugin.key,
  );
  const hasPage = (manifest?.hooks?.listens ?? []).some((hook) => hook.name === 'navigation.items');

  return {
    schoolId,
    plugin,
    consent,
    settingFields,
    hasPage,
  };
}

export default function PluginDetailPage() {
  const { schoolId, plugin, consent, settingFields, hasPage } = useLoaderData<typeof loader>();
  const { language, t } = useLanguage();
  const fetcher = useFetcher<{ error?: string }>();
  const name = language === 'sw' ? plugin.nameSw : plugin.nameEn;
  const description = language === 'sw' ? plugin.descriptionSw : plugin.descriptionEn;
  const isEnabled = plugin.status === 'enabled';
  const listPath = `/plugins?schoolId=${schoolId}`;

  return (
    <PageFrame
      title={name}
      description={description}
      contain={false}
      trail={[
        { label: t('installPlugins'), to: listPath },
        { label: name },
      ]}
    >
      <Link className="text-sm underline" to={listPath}>{t('backToPlugins')}</Link>
      {fetcher.data && 'error' in fetcher.data && fetcher.data.error ? (
        <p className="text-sm text-destructive">{fetcher.data.error}</p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{t('extensionStatus')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{t('extensionVersion')}: {plugin.version}</p>
          <p>{t('extensionStatus')}: {moduleStatusLabel(plugin, t)}</p>
          <p>
            {t('extensionCapabilities')}: {plugin.grantedCapabilities.length > 0
              ? plugin.grantedCapabilities.join(', ')
              : t('extensionNoCapabilities')}
          </p>
          {consent.map((line) => (
            <p key={line.en} className="font-medium">{language === 'sw' ? line.sw : line.en}</p>
          ))}
          {plugin.installedVersion ? (
            <p>{plugin.updateAvailable ? t('extensionUpdateAvailable') : t('extensionUpToDate')}</p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-2">
            {isEnabled && !plugin.required ? (
              <ManageButton fetcher={fetcher} schoolId={schoolId} pluginKey={plugin.key} intent="disable" label={t('turnOffExtension')} />
            ) : null}
            {(isEnabled || plugin.status === 'disabled') && !plugin.required ? (
              <ManageButton fetcher={fetcher} schoolId={schoolId} pluginKey={plugin.key} intent="remove" label={t('removeExtension')} />
            ) : null}
            {(plugin.status === 'disabled' || plugin.status === 'removed') && !plugin.required ? (
              <ManageButton fetcher={fetcher} schoolId={schoolId} pluginKey={plugin.key} intent="purge" label={t('purgeExtension')} />
            ) : null}
            {!isEnabled && !plugin.required ? (
              <ManageButton fetcher={fetcher} schoolId={schoolId} pluginKey={plugin.key} intent="enable" label={t('installExtension')} outline={false} />
            ) : null}
            {isEnabled && hasPage ? (
              <Button variant="outline" asChild>
                <Link to={`/x/${plugin.key}?schoolId=${schoolId}`}>{t('openPluginPage')}</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
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
                <input type="hidden" name="extensionKey" value={plugin.key} />
                <input type="hidden" name="settingKey" value={field.key} />
                <label className="text-sm text-muted-foreground" htmlFor={`${plugin.key}-${field.key}`}>
                  {field.key}
                </label>
                <Input
                  id={`${plugin.key}-${field.key}`}
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
    </PageFrame>
  );
}

function ManageButton({
  fetcher,
  schoolId,
  pluginKey,
  intent,
  label,
  outline = true,
}: {
  fetcher: ReturnType<typeof useFetcher>;
  schoolId: number;
  pluginKey: string;
  intent: string;
  label: string;
  outline?: boolean;
}) {
  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="schoolId" value={schoolId} />
      <input type="hidden" name="extensionKey" value={pluginKey} />
      <Button type="submit" variant={outline ? 'outline' : 'default'} disabled={fetcher.state !== 'idle'}>
        {label}
      </Button>
    </fetcher.Form>
  );
}
