import { Form, redirect, useActionData, useLoaderData } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Button } from '~/components/ui/button';
import { PageFrame } from '~/components/ui/PageFrame';
import { useLanguage } from '~/lib/i18n';
import { loadRecordScope } from '~/lib/load-record-scope';
import { requireSchoolPermission } from '~/lib/require-school-permission';

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.read');
  const scope = await loadRecordScope(request, context.services);
  const [lines, students, subjects, combinations, activeYear] = await Promise.all([
    context.services.yearSubjects.list(),
    context.services.yearSubjects.students(),
    context.services.yearSubjects.subjectChoices(),
    context.services.yearSubjects.combinationChoices(),
    context.services.yearSubjects.activeYearName(),
  ]);
  if (scope.kind === 'school') {
    return { lines, students, subjects, combinations, activeYear };
  }
  const allowed = new Set(scope.studentIds);
  const names = students.filter((student) => allowed.has(student.id)).map((student) => student.name);
  return {
    lines: lines.filter((line) => names.some((name) => line.startsWith(`${name},`) || line.startsWith(`${name}:`))),
    students: students.filter((student) => allowed.has(student.id)),
    subjects,
    combinations,
    activeYear,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  await requireSchoolPermission(request, context.services, 'students.record.write');
  const form = await request.formData();
  const studentId = Number(form.get('studentId'));
  const intent = String(form.get('intent') ?? '');
  const result = intent === 'combination'
    ? await context.services.yearSubjects.saveCombination(studentId, Number(form.get('combinationId')))
    : await context.services.yearSubjects.saveSubjects(
      studentId,
      form.getAll('subjectId').map((value) => Number(value)),
    );
  if ('error' in result) return result;
  return redirect('/student-subjects');
}

export default function StudentSubjectsPage() {
  const { lines, students, subjects, combinations, activeYear } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const { t } = useLanguage();

  return (
    <PageFrame title={t('studentSubjects')} description={t('studentSubjectsDescription')}>
      {activeYear ? <p className="text-sm">{t('academicYear')}: {activeYear}</p> : null}
      {result && 'error' in result ? <p className="text-sm text-destructive">{result.error}</p> : null}
      <Form method="post" className="space-y-3">
        <input type="hidden" name="intent" value="subjects" />
        <select name="studentId" required aria-label={t('studentsList')} className="h-9 rounded-md border px-3 text-sm">
          {students.map((student) => (
            <option key={student.id} value={student.id}>{student.name}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-3">
          {subjects.map((subject) => (
            <label key={subject.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="subjectId" value={subject.id} />
              {subject.name}
            </label>
          ))}
        </div>
        <Button type="submit">{t('saveSubjects')}</Button>
      </Form>
      <Form method="post" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="intent" value="combination" />
        <select name="studentId" required aria-label={t('studentsList')} className="h-9 rounded-md border px-3 text-sm">
          {students.map((student) => (
            <option key={student.id} value={student.id}>{student.name}</option>
          ))}
        </select>
        <select name="combinationId" required aria-label={t('combinations')} className="h-9 rounded-md border px-3 text-sm">
          {combinations.map((combination) => (
            <option key={combination.id} value={combination.id}>{combination.name}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">{t('assignCombination')}</Button>
      </Form>
      {lines.length === 0 ? <p className="text-sm text-muted-foreground">{t('noYearSubjects')}</p> : null}
      <ul className="space-y-2 text-sm">
        {lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </PageFrame>
  );
}
