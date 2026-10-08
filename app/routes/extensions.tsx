import { Link, useFetcher, useLoaderData, useSearchParams } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { PageHeader } from '~/components/ui/PageHeader';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { useLanguage } from '~/lib/i18n';
import { selectSchoolId } from '~/lib/selected-school';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import type { SelectSchool } from 'workers/database/school';
import type { InstalledExtension } from 'workers/services/extensions';
import type { ExtensionSettingField } from 'workers/services/settings';
import { findBundledManifest } from 'workers/kernel/bundled-manifests';
import { consentLines, revocationNotice, uploadBlockReason, workerLoaderPresent } from 'workers/kernel/package-upload';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.read');
  await context.services.tenancy.ensureForCurrentOwner();
  const schools: SelectSchool[] = await context.services.school.getAll();
  const schoolId = selectSchoolId(new URL(request.url), schools);
  const catalog = new URL(request.url).pathname.startsWith('/plugins') ? 'plugin' : 'module';
  const extensions: InstalledExtension[] = schoolId
    ? (await context.services.extensions.listForSchool(schoolId)).filter(
        (extension) => extension.type === catalog && extension.key !== 'themes',
      )
    : [];
  const deadEvents = schoolId ? await context.services.events.listDead(schoolId) : [];
  const settingFields: ExtensionSettingField[] = schoolId
    ? await context.services.settings.list(schoolId)
    : [];

  const selected = schools.find((school) => school.id === schoolId) ?? null;
  const isPlatformAdmin = selected != null && selected.ownerUserId === context.services.currentUserId;
  const loaderPresent = workerLoaderPresent(context.cloudflare.env);
  const publishers = isPlatformAdmin ? await context.services.publishers.list() : [];
  const revokedVersions = isPlatformAdmin ? await context.services.publishers.revokedVersions() : [];
  const consent = Object.fromEntries(extensions.map((extension) => {
    const manifest = findBundledManifest(extension.key);
    return [extension.key, consentLines({
      capabilities: manifest?.capabilities ?? [],
      outboundHosts: manifest?.outboundHosts ?? [],
    }).filter((line) => line.sensitive)];
  }));

  return {
    schools: schools.map((school) => ({ id: school.id, name: school.name })),
    schoolId,
    extensions,
    catalog,
    deadEvents,
    settingFields,
    isPlatformAdmin,
    packageUpload: isPlatformAdmin ? uploadBlockReason({ isPlatformAdmin: true, loaderPresent }) : null,
    publishers,
    revokedVersions,
    consent,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.update');
  const form = await request.formData();
  const schoolId = Number(form.get('schoolId'));
  const extensionKey = String(form.get('extensionKey') || '');
  const intent = String(form.get('intent') || 'enable');

  try {
    if (intent === 'disable') {
      await context.services.extensions.disable(schoolId, extensionKey);
      return { disabled: true };
    }
    if (intent === 'remove') {
      await context.services.extensions.remove(schoolId, extensionKey);
      return { removed: true };
    }
    if (intent === 'purge') {
      await context.services.extensions.purge(schoolId, extensionKey);
      return { purged: true };
    }
    if (intent === 'retryEvent') {
      await context.services.events.retry(schoolId, Number(form.get('eventId')));
      return { retried: true };
    }
    if (intent === 'trustPublisher' || intent === 'revokePublisher' || intent === 'revokeVersion' || intent === 'uploadPackage') {
      const knownSchools: SelectSchool[] = await context.services.school.getAll();
      return packageAdminAction(form, context, knownSchools);
    }
    if (intent === 'saveSetting') {
      const settingKey = String(form.get('settingKey') || '');
      const settingValue = String(form.get('settingValue') || '');
      await context.services.settings.set(schoolId, extensionKey, settingKey, settingValue);
      const userId = context.services.currentUserId;
      await context.services.audit.append({
        action: 'extension.setting.update',
        schoolId,
        userId,
        extensionKey,
        target: settingKey,
      });
      if (userId) {
        await context.services.notifications.notifyUser({
          schoolId,
          userId,
          extensionKey,
          title: 'Setting saved',
          body: `${settingKey} was updated.`,
        });
      }
      return { saved: true };
    }
    await context.services.extensions.enable(schoolId, extensionKey);
    return { installed: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to install that extension.';
    return { error: message };
  }
}

export default function ExtensionsPage() {
  const {
    schools,
    schoolId,
    extensions,
    catalog,
    deadEvents,
    settingFields,
    isPlatformAdmin,
    packageUpload,
    publishers,
    revokedVersions,
    consent,
  } = useLoaderData<typeof loader>();
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const fetcher = useFetcher<typeof action>();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(catalog === 'plugin' ? 'installPlugins' : 'installExtensions')}
        description={t(catalog === 'plugin' ? 'installPluginsDescription' : 'installExtensionsDescription')}
      />
      <SchoolPicker schools={schools} schoolId={schoolId} searchParams={searchParams} />
      {schoolId === null ? (
        <p className="text-sm text-muted-foreground">{t('createSchoolFirst')}</p>
      ) : (
        <ul className="space-y-3">
          {fetcher.data && 'error' in fetcher.data && fetcher.data.error ? (
            <p className="text-sm text-destructive">{fetcher.data.error}</p>
          ) : null}
          {extensions.map((extension) => {
            const name = language === 'sw' ? extension.nameSw : extension.nameEn;
            const description = language === 'sw' ? extension.descriptionSw : extension.descriptionEn;
            const isEnabled = extension.status === 'enabled';
            return (
              <li key={extension.key}>
                <Card>
                  <CardHeader>
                    <CardTitle>{name}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-3">
                    <p className="w-full text-sm text-muted-foreground">
                      {t('extensionVersion')} {extension.version}
                      {' · '}
                      {t('extensionStatus')}: {extensionStatusLabel(extension.status, extension.required, t)}
                      {' · '}
                      {t('extensionCapabilities')}: {extension.grantedCapabilities.length > 0
                        ? extension.grantedCapabilities.join(', ')
                        : t('extensionNoCapabilities')}
                      {(consent[extension.key] ?? []).map((line) => (
                        <span key={line.en} className="mt-1 block font-medium">
                          {language === 'sw' ? line.sw : line.en}
                        </span>
                      ))}
                      {extension.installedVersion
                        ? ` · ${extension.updateAvailable ? t('extensionUpdateAvailable') : t('extensionUpToDate')}`
                        : ''}
                    </p>
                    {extension.required ? (
                      <p className="text-sm text-muted-foreground">{t('extensionIncluded')}</p>
                    ) : null}
                    {extension.status === 'removed' ? (
                      <p className="text-sm text-muted-foreground">{t('extensionRemoved')}</p>
                    ) : null}
                    {isEnabled && !extension.required ? (
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="disable" />
                        <input type="hidden" name="schoolId" value={schoolId} />
                        <input type="hidden" name="extensionKey" value={extension.key} />
                        <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>
                          {t('turnOffExtension')}
                        </Button>
                      </fetcher.Form>
                    ) : null}
                    {(isEnabled || extension.status === 'disabled') && !extension.required ? (
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="remove" />
                        <input type="hidden" name="schoolId" value={schoolId} />
                        <input type="hidden" name="extensionKey" value={extension.key} />
                        <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>
                          {t('removeExtension')}
                        </Button>
                      </fetcher.Form>
                    ) : null}
                    {(extension.status === 'disabled' || extension.status === 'removed') && !extension.required ? (
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="purge" />
                        <input type="hidden" name="schoolId" value={schoolId} />
                        <input type="hidden" name="extensionKey" value={extension.key} />
                        <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>
                          {t('purgeExtension')}
                        </Button>
                      </fetcher.Form>
                    ) : null}
                    {!isEnabled && !extension.required ? (
                      <fetcher.Form method="post">
                        <input type="hidden" name="intent" value="enable" />
                        <input type="hidden" name="schoolId" value={schoolId} />
                        <input type="hidden" name="extensionKey" value={extension.key} />
                        <Button type="submit" disabled={fetcher.state !== 'idle'}>
                          {t('installExtension')}
                        </Button>
                      </fetcher.Form>
                    ) : null}
                    {extension.key === 'hello' && isEnabled ? (
                      <Link className="text-sm underline" to={`/x/hello?schoolId=${schoolId}`}>
                        {t('openExtension')}
                      </Link>
                    ) : null}
                    {isEnabled
                      ? settingFields
                        .filter((field) => field.extensionKey === extension.key)
                        .map((field) => (
                          <fetcher.Form key={field.key} method="post" className="flex flex-wrap items-center gap-2">
                            <input type="hidden" name="intent" value="saveSetting" />
                            <input type="hidden" name="schoolId" value={schoolId ?? ''} />
                            <input type="hidden" name="extensionKey" value={extension.key} />
                            <input type="hidden" name="settingKey" value={field.key} />
                            <label className="text-sm text-muted-foreground" htmlFor={`${extension.key}-${field.key}`}>
                              {field.key}
                            </label>
                            <Input
                              id={`${extension.key}-${field.key}`}
                              name="settingValue"
                              defaultValue={field.value}
                              key={`${field.key}-${field.value}`}
                              className="max-w-xs"
                            />
                            <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>
                              {t('saveSetting')}
                            </Button>
                          </fetcher.Form>
                        ))
                      : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {schoolId !== null && isPlatformAdmin ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('packageUpload')}</h2>
          {packageUpload ? <p className="text-sm text-muted-foreground">{packageUpload}</p> : null}
          <h2 className="text-lg font-semibold">{t('trustedPublishers')}</h2>
          {publishers.length === 0 ? <p className="text-sm text-muted-foreground">{t('noTrustedPublishers')}</p> : null}
          <ul className="space-y-2">
            {publishers.map((key) => (
              <li key={key.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span>{key.publisher} {key.keyId}{key.revoked ? `, ${t('publisherRevoked')}` : ''}</span>
                {key.revoked ? null : (
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="revokePublisher" />
                    <input type="hidden" name="schoolId" value={schoolId} />
                    <input type="hidden" name="publisher" value={key.publisher} />
                    <input type="hidden" name="keyId" value={key.keyId} />
                    <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>{t('revokeKey')}</Button>
                  </fetcher.Form>
                )}
              </li>
            ))}
          </ul>
          <fetcher.Form method="post" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="intent" value="trustPublisher" />
            <input type="hidden" name="schoolId" value={schoolId} />
            <label className="flex flex-col gap-1 text-sm">{t('publisherName')}<Input name="publisher" /></label>
            <label className="flex flex-col gap-1 text-sm">{t('publisherKeyId')}<Input name="keyId" /></label>
            <label className="flex flex-col gap-1 text-sm">{t('publisherPublicKey')}<Input name="publicKey" /></label>
            <Button type="submit" disabled={fetcher.state !== 'idle'}>{t('trustKey')}</Button>
          </fetcher.Form>
          {revokedVersions.length === 0 ? null : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {revokedVersions.map((item) => (
                <li key={`${item.extensionKey}-${item.version}`}>{item.extensionKey} {item.version}, {t('publisherRevoked')}</li>
              ))}
            </ul>
          )}
          <fetcher.Form method="post" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="intent" value="revokeVersion" />
            <input type="hidden" name="schoolId" value={schoolId} />
            <label className="flex flex-col gap-1 text-sm">{t('extensionKeyLabel')}<Input name="extensionKey" /></label>
            <label className="flex flex-col gap-1 text-sm">{t('extensionVersion')}<Input name="version" /></label>
            <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>{t('revokeVersion')}</Button>
          </fetcher.Form>
        </section>
      ) : null}
      {schoolId !== null && deadEvents.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('failedEvents')}</h2>
          <ul className="space-y-2">
            {deadEvents.map((event: { id: number; eventName: string; lastError: string | null }) => (
              <li key={event.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span>{event.eventName}</span>
                <span className="text-muted-foreground">{event.lastError}</span>
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="retryEvent" />
                  <input type="hidden" name="schoolId" value={schoolId} />
                  <input type="hidden" name="eventId" value={event.id} />
                  <Button type="submit" variant="outline" disabled={fetcher.state !== 'idle'}>
                    {t('retryDelivery')}
                  </Button>
                </fetcher.Form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

async function packageAdminAction(
  form: FormData,
  context: LoaderFunctionArgs['context'],
  schools: SelectSchool[],
) {
  const schoolId = Number(form.get('schoolId'));
  const school = schools.find((item) => item.id === schoolId);
  if (!school || school.ownerUserId !== context.services.currentUserId) {
    return { error: 'Only a platform administrator can upload a package.' };
  }
  const intent = String(form.get('intent') || '');
  if (intent === 'uploadPackage') {
    const reason = uploadBlockReason({
      isPlatformAdmin: true,
      loaderPresent: workerLoaderPresent(context.cloudflare.env),
    });
    return { error: reason ?? 'Choose a package.' };
  }
  if (intent === 'trustPublisher') {
    const saved = await context.services.publishers.trust(
      String(form.get('publisher') || ''),
      String(form.get('keyId') || ''),
      String(form.get('publicKey') || ''),
    );
    return 'error' in saved ? saved : { trusted: true };
  }
  if (intent === 'revokePublisher') {
    const saved = await context.services.publishers.revokeKey(
      String(form.get('publisher') || ''),
      String(form.get('keyId') || ''),
    );
    return 'error' in saved ? saved : { revoked: true };
  }
  const extensionKey = String(form.get('extensionKey') || '');
  const version = String(form.get('version') || '');
  const saved = await context.services.publishers.revokeVersion(extensionKey, version);
  if ('error' in saved) return saved;
  if (context.services.currentUserId != null) {
    await context.services.notifications.notifyUser({
      schoolId,
      userId: context.services.currentUserId,
      extensionKey,
      title: 'Version revoked',
      body: revocationNotice(extensionKey, version),
    });
  }
  return { revoked: true };
}

function extensionStatusLabel(
  status: 'enabled' | 'disabled' | 'available' | 'removed',
  required: boolean,
  t: (key: 'extensionIncluded' | 'extensionOn' | 'extensionOffStatus' | 'extensionNotInstalled' | 'extensionRemoved') => string,
): string {
  if (required) {
    return t('extensionIncluded');
  }
  if (status === 'enabled') {
    return t('extensionOn');
  }
  if (status === 'disabled') {
    return t('extensionOffStatus');
  }
  if (status === 'removed') {
    return t('extensionRemoved');
  }
  return t('extensionNotInstalled');
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
