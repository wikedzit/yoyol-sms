import { Form, redirect, useActionData, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '~/components/ui/button';
import { PageHeader } from '~/components/ui/PageHeader';
import { useLanguage } from '~/lib/i18n';
import { loadRecordScope } from '~/lib/load-record-scope';
import { requireSchoolPermission } from '~/lib/require-school-permission';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.read');
  const scope = await loadRecordScope(request, context.services);
  const [enrolments, students, classes, years] = await Promise.all([
    context.services.enrolments.list(),
    context.services.enrolments.students(),
    context.services.enrolments.classes(),
    context.services.enrolments.years(),
  ]);
  if (scope.kind === 'school') {
    return { enrolments, students, classes, years };
  }
  const allowed = new Set(scope.studentIds);
  return {
    enrolments: enrolments.filter((enrolment) => allowed.has(enrolment.studentId)),
    students: students.filter((student) => allowed.has(student.id)),
    classes,
    years,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.write');
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const enrolments = context.services.enrolments;

  if (intent === 'enrol') {
    const studentId = Number(form.get('studentId'));
    const classValue = String(form.get('formClassId') ?? '');
    const formClassId = classValue.length > 0 ? Number(classValue) : null;
    const result = await enrolments.enrol(studentId, formClassId);
    if ('error' in result) {
      return result;
    }
    return redirect('/enrolments');
  }

  if (intent === 'promote' || intent === 'graduate') {
    const sourceClassId = Number(form.get('sourceClassId'));
    const selectedStudentIds = form.getAll('studentId').map((value) => Number(value));
    const wholeClass = form.get('wholeClass') === 'yes';
    const result = intent === 'promote'
      ? await enrolments.promote({
        sourceClassId,
        selectedStudentIds,
        wholeClass,
        nextYearId: Number(form.get('nextYearId')),
        nextFormClassId: Number(form.get('nextFormClassId')),
      })
      : await enrolments.graduate({ sourceClassId, selectedStudentIds, wholeClass });
    if ('error' in result) {
      return result;
    }
    return redirect('/enrolments');
  }

  const enrolmentId = Number(form.get('enrolmentId'));
  if (!Number.isInteger(enrolmentId) || enrolmentId < 1) {
    return { error: 'That enrolment was not found.' };
  }

  if (intent === 'move') {
    const result = await enrolments.move(
      enrolmentId,
      Number(form.get('formClassId')),
      String(form.get('reason') ?? ''),
    );
    if ('error' in result) {
      return result;
    }
    return redirect('/enrolments');
  }

  if (intent === 'end') {
    const result = await enrolments.end(enrolmentId, String(form.get('status') ?? ''));
    if ('error' in result) {
      return result;
    }
    return redirect('/enrolments');
  }

  return { error: 'That enrolment action was not recognised.' };
}

export default function EnrolmentsPage() {
  const { enrolments, students, classes, years } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <PageHeader title={t('enrolments')} description={t('enrolmentsDescription')} />
      {result && 'error' in result ? <p className="text-sm text-destructive">{result.error}</p> : null}
      <Form method="post" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="intent" value="enrol" />
        <select name="studentId" required aria-label={t('studentsList')} className="h-9 rounded-md border px-3 text-sm">
          {students.map((student) => (
            <option key={student.id} value={student.id}>{student.name}</option>
          ))}
        </select>
        <select name="formClassId" aria-label={t('classrooms')} className="h-9 rounded-md border px-3 text-sm">
          <option value="">{t('noClass')}</option>
          {classes.map((formClass) => (
            <option key={formClass.id} value={formClass.id}>{formClass.name}</option>
          ))}
        </select>
        <Button type="submit">{t('enrolStudent')}</Button>
      </Form>
      <Form method="post" className="flex flex-wrap items-center gap-2 rounded-md border p-4">
        <input type="hidden" name="intent" value="promote" />
        <select name="sourceClassId" required aria-label={t('classrooms')} className="h-9 rounded-md border px-3 text-sm">
          {classes.map((formClass) => (
            <option key={formClass.id} value={formClass.id}>{formClass.name}</option>
          ))}
        </select>
        <select name="nextYearId" required aria-label={t('nextYear')} className="h-9 rounded-md border px-3 text-sm">
          {years.map((year) => (
            <option key={year.id} value={year.id}>{year.name}</option>
          ))}
        </select>
        <select name="nextFormClassId" required aria-label={t('classrooms')} className="h-9 rounded-md border px-3 text-sm">
          {classes.map((formClass) => (
            <option key={formClass.id} value={formClass.id}>{formClass.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="wholeClass" value="yes" />
          {t('wholeClass')}
        </label>
        {students.map((student) => (
          <label key={student.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="studentId" value={student.id} />
            {student.name}
          </label>
        ))}
        <Button type="submit">{t('promoteClass')}</Button>
      </Form>
      <Form method="post" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="intent" value="graduate" />
        <select name="sourceClassId" required aria-label={t('classrooms')} className="h-9 rounded-md border px-3 text-sm">
          {classes.map((formClass) => (
            <option key={formClass.id} value={formClass.id}>{formClass.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="wholeClass" value="yes" />
          {t('wholeClass')}
        </label>
        <Button type="submit" variant="outline">{t('graduateStudents')}</Button>
      </Form>
      {enrolments.length === 0 ? <p>{t('noEnrolments')}</p> : null}
      <div className="space-y-4">
        {enrolments.map((enrolment) => (
          <section key={enrolment.id} className="space-y-2 rounded-md border p-4">
            <p>
              {enrolment.studentName}, {enrolment.yearName}
              {enrolment.className ? ` / ${enrolment.className}` : ''} ({enrolment.status})
              {enrolment.moveReason ? `, moved: ${enrolment.moveReason}` : ''}
            </p>
            {enrolment.status === 'enrolled' ? (
              <div className="flex flex-wrap items-center gap-2">
                <Form method="post" className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="intent" value="move" />
                  <input type="hidden" name="enrolmentId" value={enrolment.id} />
                  <select name="formClassId" required aria-label={t('classrooms')} className="h-9 rounded-md border px-3 text-sm">
                    {classes.map((formClass) => (
                      <option key={formClass.id} value={formClass.id}>{formClass.name}</option>
                    ))}
                  </select>
                  <input
                    name="reason"
                    required
                    placeholder={t('moveReason')}
                    aria-label={t('moveReason')}
                    className="h-9 rounded-md border px-3 text-sm"
                  />
                  <Button type="submit" variant="outline">{t('moveClass')}</Button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="end" />
                  <input type="hidden" name="enrolmentId" value={enrolment.id} />
                  <input type="hidden" name="status" value="left" />
                  <Button type="submit" variant="outline">{t('endAsLeft')}</Button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="end" />
                  <input type="hidden" name="enrolmentId" value={enrolment.id} />
                  <input type="hidden" name="status" value="transferred" />
                  <Button type="submit" variant="outline">{t('endAsTransferred')}</Button>
                </Form>
              </div>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
