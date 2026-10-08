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
import { requireSchoolPermission, selectedSchoolId } from '~/lib/require-school-permission';

const staffTypes = ['teaching', 'finance', 'administration', 'support'] as const;

export async function loader({ request, context }: LoaderFunctionArgs) {
  const schoolId = await selectedSchoolId(request, context.services);
  const canRead = schoolId == null
    ? true
    : await context.services.access.can(schoolId, 'staff.record.read');
  const teacherId = await context.services.staff.linkedTeacherId();
  if (!canRead && teacherId == null) {
    await requireSchoolPermission(request, context.services, 'staff.record.read');
  }
  const canWrite = schoolId != null && await context.services.access.can(schoolId, 'staff.record.write');
  const [people, lines, choices, years, classes, subjects] = await Promise.all([
    canRead ? context.services.staff.list(null) : Promise.resolve([]),
    context.services.staff.assignments(null, canRead ? null : teacherId),
    canWrite ? context.services.staff.assignmentChoices() : Promise.resolve([]),
    context.services.academicYear.getAllYears(),
    context.services.enrolments.classes(),
    context.services.yearSubjects.subjectChoices(),
  ]);
  return { people, lines, choices, years, classes, subjects, canWrite, teacherId };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  if (intent === 'invite') {
    await requireSchoolPermission(request, context.services, 'staff.record.write');
    const prepared = await context.services.staff.prepareInvite(Number(form.get('teacherId')));
    if ('error' in prepared) return prepared;
    const created = await context.services.invitations.create({
      schoolId: prepared.schoolId,
      email: prepared.email,
      roleId: prepared.roleId,
      teacherId: Number(form.get('teacherId')),
    });
    if ('error' in created) return created;
    return { acceptPath: `/auth/invite?token=${created.token}` };
  }

  await requireSchoolPermission(request, context.services, 'staff.record.write');
  const input = {
    firstName: String(form.get('firstName') ?? ''),
    middleName: String(form.get('middleName') ?? ''),
    lastName: String(form.get('lastName') ?? ''),
    gender: String(form.get('gender') ?? ''),
    phone: String(form.get('phone') ?? ''),
    email: String(form.get('email') ?? ''),
    address: String(form.get('address') ?? ''),
    staffType: String(form.get('staffType') ?? ''),
    qualification: String(form.get('qualification') ?? ''),
  };
  const result = intent === 'create'
    ? await context.services.staff.create(input)
    : intent === 'status'
      ? await context.services.staff.setStatus(Number(form.get('teacherId')), String(form.get('status') ?? ''))
      : intent === 'remove'
        ? await context.services.staff.remove(Number(form.get('teacherId')))
        : intent === 'assign'
          ? await context.services.staff.assign({
            teacherId: Number(form.get('teacherId')),
            yearId: Number(form.get('yearId')),
            subjectId: Number(form.get('subjectId')),
            formClassId: Number(form.get('formClassId')),
          })
          : intent === 'unassign'
            ? await context.services.staff.removeAssignment(Number(form.get('assignmentId')))
            : { error: 'Choose an action.' };
  if ('error' in result) return result;
  return redirect('/staff');
}

export default function StaffPage() {
  const { people, lines, choices, years, classes, subjects, canWrite } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const { t } = useLanguage();
  const message = result && 'error' in result
    ? result.error
    : result && 'acceptPath' in result
      ? result.acceptPath
      : null;

  return (
    <div className="space-y-6">
      <PageHeader title={t('staffRecords')} description={t('staffRecordsDescription')} />
      {message ? <p className="text-sm">{message}</p> : null}
      {lines.length === 0 ? <p className="text-sm">{t('noStaff')}</p> : (
        <ul className="space-y-1 text-sm">
          {lines.map((line) => <li key={line}>{line}</li>)}
        </ul>
      )}
      {people.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">{t('name')}</TableHead>
                <TableHead className="font-semibold">{t('staffType')}</TableHead>
                <TableHead className="font-semibold">{t('email')}</TableHead>
                <TableHead className="font-semibold">{t('phone')}</TableHead>
                <TableHead className="font-semibold">{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">{person.name}</TableCell>
                  <TableCell>{person.staffType}</TableCell>
                  <TableCell>{person.email}</TableCell>
                  <TableCell>{person.phone}</TableCell>
                  <TableCell>{person.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
      {canWrite ? (
        <>
          <Form method="post" className="grid gap-2 sm:grid-cols-2">
            <input type="hidden" name="intent" value="create" />
            <input name="firstName" required placeholder={t('firstName')} aria-label={t('firstName')} className="h-9 rounded-md border px-3 text-sm" />
            <input name="middleName" placeholder={t('middleName')} aria-label={t('middleName')} className="h-9 rounded-md border px-3 text-sm" />
            <input name="lastName" required placeholder={t('lastName')} aria-label={t('lastName')} className="h-9 rounded-md border px-3 text-sm" />
            <input name="gender" placeholder={t('gender')} aria-label={t('gender')} className="h-9 rounded-md border px-3 text-sm" />
            <input name="phone" required placeholder={t('phone')} aria-label={t('phone')} className="h-9 rounded-md border px-3 text-sm" />
            <input name="email" type="email" required placeholder={t('email')} aria-label={t('email')} className="h-9 rounded-md border px-3 text-sm" />
            <input name="address" placeholder={t('address')} aria-label={t('address')} className="h-9 rounded-md border px-3 text-sm" />
            <input name="qualification" placeholder={t('qualification')} aria-label={t('qualification')} className="h-9 rounded-md border px-3 text-sm" />
            <select name="staffType" aria-label={t('staffType')} className="h-9 rounded-md border px-3 text-sm">
              {staffTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <Button type="submit">{t('addStaff')}</Button>
          </Form>
          <Form method="post" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="intent" value="assign" />
            <select name="teacherId" required aria-label={t('teachers')} className="h-9 rounded-md border px-3 text-sm">
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
            <select name="yearId" required aria-label={t('academicYear')} className="h-9 rounded-md border px-3 text-sm">
              {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
            <select name="subjectId" required aria-label={t('subjects')} className="h-9 rounded-md border px-3 text-sm">
              {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select name="formClassId" required aria-label={t('classrooms')} className="h-9 rounded-md border px-3 text-sm">
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <Button type="submit">{t('assignTeaching')}</Button>
          </Form>
          <Form method="post" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="intent" value="invite" />
            <select name="teacherId" required aria-label={t('inviteStaff')} className="h-9 rounded-md border px-3 text-sm">
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
            <Button type="submit">{t('inviteStaff')}</Button>
          </Form>
          <Form method="post" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="intent" value="status" />
            <select name="teacherId" required aria-label={t('teachers')} className="h-9 rounded-md border px-3 text-sm">
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
            <select name="status" aria-label={t('status')} className="h-9 rounded-md border px-3 text-sm">
              <option value="Inactive">Inactive</option>
              <option value="Active">Active</option>
            </select>
            <Button type="submit" variant="outline">{t('status')}</Button>
          </Form>
          <Form method="post" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="intent" value="remove" />
            <select name="teacherId" required aria-label={t('teachers')} className="h-9 rounded-md border px-3 text-sm">
              {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
            <Button type="submit" variant="outline">{t('delete')}</Button>
          </Form>
          <Form method="post" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="intent" value="unassign" />
            <select name="assignmentId" required aria-label={t('removeAssignment')} className="h-9 rounded-md border px-3 text-sm">
              {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
            </select>
            <Button type="submit" variant="outline">{t('removeAssignment')}</Button>
          </Form>
        </>
      ) : null}
    </div>
  );
}
