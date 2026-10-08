import { Fragment } from 'react';
import { Form, redirect, useActionData, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
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
import { loadRecordScope } from '~/lib/load-record-scope';
import { requireSchoolPermission } from '~/lib/require-school-permission';
import { readRememberedSchoolId, selectSchoolId } from '~/lib/selected-school';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.read');
  const schools = await context.services.school.getAll();
  const rememberedId = await readRememberedSchoolId(request);
  const schoolId = selectSchoolId(new URL(request.url), schools, rememberedId);
  const scope = await loadRecordScope(request, context.services);
  const [listed, students] = await Promise.all([
    context.services.guardians.list(),
    context.services.guardians.students(),
  ]);
  const guardians = scope.kind === 'limited'
    ? listed.filter((guardian) => guardian.userId === context.services.currentUserId)
    : listed;
  const visibleStudents = scope.kind === 'limited'
    ? students.filter((student) => scope.studentIds.includes(student.id))
    : students;
  const canInvite = schoolId
    ? await context.services.access.can(schoolId, 'students.record.write')
    : false;
  if (schoolId) {
    await context.services.audit.append({
      action: 'guardians.contact.read',
      schoolId,
      userId: context.services.currentUserId,
      extensionKey: 'students',
      target: 'guardians',
      detail: `${guardians.length} contact records`,
    });
  }
  return { guardians, students: visibleStudents, canInvite };
}

export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.write');
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const guardians = context.services.guardians;
  const details = {
    fullName: String(form.get('fullName') ?? ''),
    phone: String(form.get('phone') ?? ''),
    email: String(form.get('email') ?? ''),
    address: String(form.get('address') ?? ''),
  };

  if (intent === 'create') {
    const result = await guardians.create(details);
    if ('error' in result) return result;
    return redirect('/guardians');
  }

  const guardianId = Number(form.get('guardianId'));
  if (intent === 'update') {
    const result = await guardians.update(guardianId, details);
    if ('error' in result) return result;
    return redirect('/guardians');
  }

  if (intent === 'remove') {
    const result = await guardians.remove(guardianId);
    if ('error' in result) return result;
    return redirect('/guardians');
  }

  if (intent === 'link') {
    const result = await guardians.link({
      guardianId,
      studentId: Number(form.get('studentId')),
      relationship: String(form.get('relationship') ?? ''),
      primary: form.get('primary') === 'yes',
    });
    if ('error' in result) return result;
    return redirect('/guardians');
  }

  const linkId = Number(form.get('linkId'));
  if (intent === 'unlink') {
    const result = await guardians.unlink(linkId);
    if ('error' in result) return result;
    return redirect('/guardians');
  }

  if (intent === 'primary') {
    const result = await guardians.makePrimary(linkId);
    if ('error' in result) return result;
    return redirect('/guardians');
  }

  if (intent === 'invite') {
    const prepared = await guardians.prepareInvite(guardianId);
    if ('error' in prepared) return prepared;
    const created = await context.services.invitations.create({
      schoolId: prepared.schoolId,
      email: prepared.email,
      roleId: prepared.roleId,
      guardianId,
    });
    return { acceptPath: `/auth/invite?token=${created.token}` };
  }

  return { error: 'That guardian action was not recognised.' };
}

export default function GuardiansPage() {
  const { guardians, students, canInvite } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <PageHeader title={t('guardians')} description={t('guardiansDescription')} />
      {result && 'error' in result ? <p className="text-sm text-destructive">{result.error}</p> : null}
      {result && 'acceptPath' in result ? (
        <p className="text-sm">{t('invitationLink')}: <a className="underline" href={result.acceptPath}>{result.acceptPath}</a></p>
      ) : null}
      <Form method="post" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="intent" value="create" />
        <input name="fullName" required aria-label={t('guardianName')} placeholder={t('guardianName')} className="h-9 rounded-md border px-3 text-sm" />
        <input name="phone" aria-label={t('phone')} placeholder={t('phone')} className="h-9 rounded-md border px-3 text-sm" />
        <input name="email" aria-label={t('email')} placeholder={t('email')} className="h-9 rounded-md border px-3 text-sm" />
        <input name="address" aria-label={t('address')} placeholder={t('address')} className="h-9 rounded-md border px-3 text-sm" />
        <Button type="submit">{t('addGuardian')}</Button>
      </Form>
      {guardians.map((guardian) => (
        <Form key={guardian.id} method="post" id={`guardian-${guardian.id}`} className="hidden">
          <input type="hidden" name="intent" value="update" />
          <input type="hidden" name="guardianId" value={guardian.id} />
        </Form>
      ))}
      {guardians.length === 0 ? <p className="text-sm text-muted-foreground">{t('noGuardians')}</p> : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{t('guardianName')}</TableHead>
                <TableHead className="font-semibold">{t('phone')}</TableHead>
                <TableHead className="font-semibold">{t('email')}</TableHead>
                <TableHead className="font-semibold">{t('address')}</TableHead>
                <TableHead className="font-semibold">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guardians.map((guardian) => {
                const formId = `guardian-${guardian.id}`;
                return (
                  <Fragment key={guardian.id}>
                    <TableRow>
                      <TableCell>
                        <input form={formId} name="fullName" required defaultValue={guardian.fullName} aria-label={t('guardianName')} className="h-8 w-40 rounded-md border px-2 text-sm" />
                      </TableCell>
                      <TableCell>
                        <input form={formId} name="phone" defaultValue={guardian.phone ?? ''} aria-label={t('phone')} className="h-8 w-32 rounded-md border px-2 text-sm" />
                      </TableCell>
                      <TableCell>
                        <input form={formId} name="email" defaultValue={guardian.email ?? ''} aria-label={t('email')} className="h-8 w-44 rounded-md border px-2 text-sm" />
                      </TableCell>
                      <TableCell>
                        <input form={formId} name="address" defaultValue={guardian.address ?? ''} aria-label={t('address')} className="h-8 w-40 rounded-md border px-2 text-sm" />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="submit" form={formId} size="sm">{t('saveGuardian')}</Button>
                          <Form method="post">
                            <input type="hidden" name="intent" value="remove" />
                            <input type="hidden" name="guardianId" value={guardian.id} />
                            <Button type="submit" size="sm" variant="outline">{t('delete')}</Button>
                          </Form>
                          {guardian.userId ? <span className="text-xs text-muted-foreground">{t('guardianHasAccount')}</span> : null}
                          {canInvite && !guardian.userId ? (
                            <Form method="post">
                              <input type="hidden" name="intent" value="invite" />
                              <input type="hidden" name="guardianId" value={guardian.id} />
                              <Button type="submit" size="sm" variant="outline">{t('inviteGuardian')}</Button>
                            </Form>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={5} className="whitespace-normal">
                        <div className="space-y-2">
                          {guardian.links.map((link) => (
                            <div key={link.id} className="flex flex-wrap items-center gap-2 text-sm">
                              <span>{link.studentName}: {link.relationship}{link.primary ? `, ${t('primaryContact')}` : ''}</span>
                              <Form method="post">
                                <input type="hidden" name="intent" value="unlink" />
                                <input type="hidden" name="linkId" value={link.id} />
                                <Button type="submit" variant="outline" size="sm">{t('unlink')}</Button>
                              </Form>
                              {link.primary ? null : (
                                <Form method="post">
                                  <input type="hidden" name="intent" value="primary" />
                                  <input type="hidden" name="linkId" value={link.id} />
                                  <Button type="submit" variant="outline" size="sm">{t('primaryContact')}</Button>
                                </Form>
                              )}
                            </div>
                          ))}
                          <Form method="post" className="flex flex-wrap items-center gap-2">
                            <input type="hidden" name="intent" value="link" />
                            <input type="hidden" name="guardianId" value={guardian.id} />
                            <select name="studentId" required aria-label={t('studentsList')} className="h-8 rounded-md border px-2 text-sm">
                              {students.map((student) => (
                                <option key={student.id} value={student.id}>{student.name}</option>
                              ))}
                            </select>
                            <input name="relationship" required aria-label={t('relationship')} placeholder={t('relationship')} className="h-8 rounded-md border px-2 text-sm" />
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" name="primary" value="yes" />
                              {t('primaryContact')}
                            </label>
                            <Button type="submit" size="sm">{t('linkStudent')}</Button>
                          </Form>
                        </div>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
