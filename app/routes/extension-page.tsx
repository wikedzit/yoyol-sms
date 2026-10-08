import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Link, redirect, useActionData, useLoaderData, useParams } from 'react-router';
import { renderText, ViewDocumentView } from '~/components/ViewDocumentView';
import { PageFrame } from '~/components/ui/PageFrame';
import { useLanguage } from '~/lib/i18n';
import { loadRecordScope } from '~/lib/load-record-scope';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import { selectSchoolId } from '~/lib/selected-school';
import type { SelectSchool } from 'workers/database/school';
import { appModules } from 'workers/kernel/modules';
import { bundledExtensionHost } from 'workers/kernel/bundled-host';
import { localesFor } from 'workers/kernel/bundled-locales';
import { createExtensionLog } from 'workers/kernel/log';
import { keepStudentLines } from 'workers/kernel/guardian-accounts';
import { parseViewDocument, viewDocumentError, type ViewDocument } from 'workers/kernel/view-document';

type PageState =
  | { state: 'view'; document: ViewDocument; catalog: { en: Record<string, string>; sw: Record<string, string> } }
  | { state: 'off' }
  | { state: 'missing' }
  | { state: 'invalid' };

export async function loader({ request, params, context }: LoaderFunctionArgs): Promise<PageState> {
  await requireSchoolPermission(request, context.services, 'school.profile.read');
  await context.services.tenancy.ensureForCurrentOwner();
  const schools: SelectSchool[] = await context.services.school.getAll();
  const schoolId = selectSchoolId(new URL(request.url), schools);
  const extensionKey = params.extension ?? '';
  if (schoolId === null || !extensionKey) {
    return { state: 'missing' };
  }

  const enabled = await context.services.extensions.isEnabled(schoolId, extensionKey);
  if (!enabled) {
    return { state: 'off' };
  }

  const entrypoint = await bundledExtensionHost.getEntrypoint(
    { key: extensionKey, version: 'bundled' },
    [],
  ).catch((error: unknown) => {
    if (error instanceof Error && error.message === `${extensionKey} is not bundled.`) {
      return null;
    }
    throw error;
  });
  if (!entrypoint) {
    return { state: 'missing' };
  }

  if (extensionKey === 'attendance' || extensionKey === 'finance' || extensionKey === 'timetable' || extensionKey === 'lesson-plans' || extensionKey === 'discipline' || extensionKey === 'clubs' || extensionKey === 'leadership' || extensionKey === 'reports' || extensionKey === 'sms' || extensionKey === 'email' || extensionKey === 'fee-reminders' || extensionKey === 'absence-alerts') {
    try {
      await context.services.extensions.enable(schoolId, extensionKey);
    } catch {
      // The page still opens when the hooks are already registered.
    }
  }

  const rest = params['*'] ?? '';
  const path = rest ? `/${rest}` : '/';
  const extensionContext = await context.services.extensions.contextFor(schoolId, extensionKey);
  const response = await entrypoint.handlePage({ path, search: new URL(request.url).search }, extensionContext);
  if (response.kind !== 'view') {
    return { state: 'missing' };
  }
  if (viewDocumentError(response.document)) {
    createExtensionLog(extensionKey, { requestId: context.services.requestId }).error('The extension page returned a document that could not be shown.');
    return { state: 'invalid' };
  }

  const document = await narrowStudentPage(
    parseViewDocument(response.document),
    extensionKey,
    request,
    context.services,
  );

  return {
    state: 'view',
    document,
    catalog: localesFor(extensionKey),
  };
}

async function narrowStudentPage(
  document: ViewDocument,
  extensionKey: string,
  request: Request,
  services: Parameters<typeof loadRecordScope>[1] & {
    guardians: { students: () => Promise<{ id: number; name: string }[]> };
  },
): Promise<ViewDocument> {
  if (extensionKey !== 'students') {
    return document;
  }
  const scope = await loadRecordScope(request, services);
  if (scope.kind !== 'limited') {
    return document;
  }
  const people = await services.guardians.students();
  const allowed = new Set(scope.studentIds);
  const names = people.filter((student) => allowed.has(student.id)).map((student) => student.name);
  return { ...document, body: keepStudentLines(document.body, names) };
}

export async function action({ request, params, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'school.profile.read');
  await context.services.tenancy.ensureForCurrentOwner();
  const schools: SelectSchool[] = await context.services.school.getAll();
  const schoolId = selectSchoolId(new URL(request.url), schools);
  const extensionKey = params.extension ?? '';
  if (schoolId === null || !extensionKey) {
    return { error: 'Choose a school before changing its records.' };
  }
  const entrypoint = await bundledExtensionHost.getEntrypoint(
    { key: extensionKey, version: 'bundled' },
    [],
  );
  const form = await request.formData();
  const fields = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  const extensionContext = await context.services.extensions.contextFor(schoolId, extensionKey);
  const result = await entrypoint.handleAction(String(fields._action ?? ''), fields, extensionContext);
  if ('error' in result && result.error) return result;
  return redirect(request.url);
}

export default function ExtensionPage() {
  const page = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const params = useParams();
  const { t, language } = useLanguage();
  const appLanguage = language === 'sw' ? 'sw' : 'en';
  const extensionKey = params.extension ?? '';
  const moduleName = appModules.find((module) => module.key === extensionKey)?.name[appLanguage];
  const title = page.state === 'view'
    ? renderText(page.document.title, page.catalog, appLanguage)
    : moduleName || t('extensionPageInvalid');
  const trail = page.state === 'view'
    ? page.document.breadcrumbs?.map((crumb) => {
      const label = renderText(crumb.label, page.catalog, appLanguage);
      return crumb.href ? { label, to: crumb.href } : { label };
    })
    : undefined;

  if (page.state === 'off') {
    return (
      <PageFrame title={title} trail={trail}>
        <p className="text-sm text-muted-foreground">{t('extensionOff')}</p>
        <Link className="text-sm underline" to="/modules">{t('installExtensions')}</Link>
      </PageFrame>
    );
  }
  if (page.state === 'invalid' || page.state === 'missing') {
    return (
      <PageFrame title={title} trail={trail}>
        <p className="text-sm text-muted-foreground">{t('extensionPageInvalid')}</p>
      </PageFrame>
    );
  }

  return (
    <PageFrame title={title} trail={trail}>
      {result && 'error' in result && result.error ? <p className="text-sm">{result.error}</p> : null}
      <ViewDocumentView
        document={page.document}
        catalog={page.catalog}
        language={appLanguage}
        showTitle={false}
      />
    </PageFrame>
  );
}
