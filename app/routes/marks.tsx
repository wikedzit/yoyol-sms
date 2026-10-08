import { Form, useActionData, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '~/components/ui/button';
import { PageFrame } from '~/components/ui/PageFrame';
import { useLanguage } from '~/lib/i18n';
import { requireSchoolPermission, selectedSchoolId } from '~/lib/require-school-permission';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const schoolId = await selectedSchoolId(request, context.services);
  const canRead = schoolId == null ? true : await context.services.access.can(schoolId, 'students.record.read');
  const teacherId = await context.services.staff.linkedTeacherId();
  if (!canRead && teacherId == null) {
    await requireSchoolPermission(request, context.services, 'students.record.read');
  }
  if (schoolId != null) {
    try {
      await context.services.extensions.enable(schoolId, 'assessment');
    } catch {
      // Released results still appear when the hook is already registered.
    }
  }
  await context.services.assessment.ensureDefaults();
  const url = new URL(request.url);
  const classId = Number(url.searchParams.get('classId') || 0);
  const subjectId = Number(url.searchParams.get('subjectId') || 0);
  const typeId = Number(url.searchParams.get('typeId') || 0);
  const termId = Number(url.searchParams.get('termId') || 0);
  const [types, classes, subjects, years, ownRows] = await Promise.all([
    context.services.assessment.types(),
    context.services.enrolments.classes(),
    context.services.yearSubjects.subjectChoices(),
    context.services.academicYear.getAllYearsWithTerms(),
    context.services.staff.assignmentRows(teacherId),
  ]);
  const term = years.flatMap((year) => year.terms.map((item) => ({ ...item, yearId: year.id }))).find((item) => item.id === termId);
  const allowedClasses = teacherId == null ? null : new Set(ownRows.map((row) => row.formClassId));
  const allowedSubjects = teacherId == null ? null : new Set(ownRows.map((row) => row.subjectId));
  const students = term && classId && subjectId
    ? await context.services.assessment.classStudents(classId, term.yearId)
    : [];
  const canRelease = schoolId != null && await context.services.access.can(schoolId, 'students.record.write');
  return {
    types: types.filter((type) => type.status === 'active'),
    classes: allowedClasses ? classes.filter((item) => allowedClasses.has(item.id)) : classes,
    subjects: allowedSubjects ? subjects.filter((item) => allowedSubjects.has(item.id)) : subjects,
    years,
    students,
    classId,
    subjectId,
    typeId,
    termId,
    canRelease,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const teacherId = await context.services.staff.linkedTeacherId();
  if (intent === 'release' || intent === 'withdraw' || intent === 'type' || intent === 'deactivate') {
    await requireSchoolPermission(request, context.services, 'students.record.write');
  } else if (teacherId == null) {
    await requireSchoolPermission(request, context.services, 'students.record.write');
  }

  if (intent === 'release') {
    const result = await context.services.assessment.release(Number(form.get('termId')));
    return result;
  }
  if (intent === 'withdraw') {
    return context.services.assessment.withdraw(Number(form.get('termId')));
  }
  if (intent === 'type') {
    return context.services.assessment.addType(String(form.get('name') ?? ''));
  }
  if (intent === 'deactivate') {
    return context.services.assessment.deactivateType(Number(form.get('typeId')));
  }

  const subjectId = Number(form.get('subjectId'));
  const typeId = Number(form.get('typeId'));
  const termId = Number(form.get('termId'));
  const errors: string[] = [];
  for (const value of form.getAll('studentId')) {
    const studentId = Number(value);
    const scoreText = String(form.get(`score-${studentId}`) ?? '').trim();
    if (scoreText.length === 0) continue;
    const saved = await context.services.assessment.saveMark({
      studentId,
      termId,
      subjectId,
      assessmentTypeId: typeId,
      teacherId,
      score: Number(scoreText),
      comment: String(form.get(`comment-${studentId}`) ?? ''),
      actorTeacherId: teacherId,
    });
    if ('error' in saved) errors.push(saved.error);
  }
  if (errors.length > 0) return { error: errors[0] ?? 'That mark is outside the grading scale.' };
  return { saved: true };
}

export default function MarksPage() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const { t } = useLanguage();
  const message = result && 'error' in result ? result.error : null;

  return (
    <PageFrame title={t('marks')} description={t('marksDescription')}>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <Form method="get" className="flex flex-wrap items-center gap-2">
        <select name="classId" defaultValue={data.classId || ''} required aria-label={t('classrooms')} className="h-9 rounded-md border px-3 text-sm">
          {data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select name="subjectId" defaultValue={data.subjectId || ''} required aria-label={t('subjects')} className="h-9 rounded-md border px-3 text-sm">
          {data.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select name="typeId" defaultValue={data.typeId || ''} required aria-label={t('marks')} className="h-9 rounded-md border px-3 text-sm">
          {data.types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select name="termId" defaultValue={data.termId || ''} required aria-label={t('academicYear')} className="h-9 rounded-md border px-3 text-sm">
          {data.years.flatMap((year) => year.terms.map((term) => (
            <option key={term.id} value={term.id}>{year.name} / {term.name}</option>
          )))}
        </select>
        <Button type="submit">{t('marks')}</Button>
      </Form>
      {data.students.length > 0 && data.typeId && data.termId ? (
        <Form method="post" className="space-y-3">
          <input type="hidden" name="intent" value="save" />
          <input type="hidden" name="subjectId" value={data.subjectId} />
          <input type="hidden" name="typeId" value={data.typeId} />
          <input type="hidden" name="termId" value={data.termId} />
          {data.students.map((student) => (
            <div key={student.id} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="studentId" value={student.id} />
              <span className="w-56 text-sm">{student.name}</span>
              <input name={`score-${student.id}`} inputMode="numeric" aria-label={student.name} className="h-9 w-24 rounded-md border px-3 text-sm" />
              <input name={`comment-${student.id}`} aria-label={student.name} className="h-9 rounded-md border px-3 text-sm" />
            </div>
          ))}
          <Button type="submit">{t('saveMarks')}</Button>
        </Form>
      ) : null}
      {data.canRelease ? (
        <div className="flex flex-wrap gap-4">
          <Form method="post" className="flex items-center gap-2">
            <input type="hidden" name="intent" value="release" />
            <select name="termId" required aria-label={t('releaseResults')} className="h-9 rounded-md border px-3 text-sm">
              {data.years.flatMap((year) => year.terms.map((term) => (
                <option key={term.id} value={term.id}>{year.name} / {term.name}</option>
              )))}
            </select>
            <Button type="submit">{t('releaseResults')}</Button>
          </Form>
          <Form method="post" className="flex items-center gap-2">
            <input type="hidden" name="intent" value="withdraw" />
            <select name="termId" required aria-label={t('withdrawRelease')} className="h-9 rounded-md border px-3 text-sm">
              {data.years.flatMap((year) => year.terms.map((term) => (
                <option key={term.id} value={term.id}>{year.name} / {term.name}</option>
              )))}
            </select>
            <Button type="submit" variant="outline">{t('withdrawRelease')}</Button>
          </Form>
          <Form method="post" className="flex items-center gap-2">
            <input type="hidden" name="intent" value="type" />
            <input name="name" required aria-label={t('addStaff')} className="h-9 rounded-md border px-3 text-sm" />
            <Button type="submit">{t('addStaff')}</Button>
          </Form>
          <Form method="post" className="flex items-center gap-2">
            <input type="hidden" name="intent" value="deactivate" />
            <select name="typeId" required aria-label={t('marks')} className="h-9 rounded-md border px-3 text-sm">
              {data.types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <Button type="submit" variant="outline">{t('status')}</Button>
          </Form>
        </div>
      ) : null}
    </PageFrame>
  );
}
