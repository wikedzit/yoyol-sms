import { Form, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { Button } from '~/components/ui/button';
import { PageFrame } from '~/components/ui/PageFrame';
import { useLanguage } from '~/lib/i18n';
import { loadRecordScope } from '~/lib/load-record-scope';
import { requireSchoolPermission, selectedSchoolId } from '~/lib/require-school-permission';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const schoolId = await selectedSchoolId(request, context.services);
  const canRead = schoolId == null ? true : await context.services.access.can(schoolId, 'students.record.read');
  const teacherId = await context.services.staff.linkedTeacherId();
  if (!canRead && teacherId == null) {
    await requireSchoolPermission(request, context.services, 'students.record.read');
  }
  const scope = await loadRecordScope(request, context.services);
  const url = new URL(request.url);
  const studentId = Number(url.searchParams.get('studentId') || 0);
  const termId = Number(url.searchParams.get('termId') || 0);
  const familyView = scope.kind === 'limited' && teacherId == null;
  const [students, years] = await Promise.all([
    context.services.yearSubjects.students(),
    context.services.academicYear.getAllYearsWithTerms(),
  ]);
  const visibleStudents = scope.kind === 'school'
    ? students
    : students.filter((student) => scope.studentIds.includes(student.id));
  const allowedStudent = scope.kind === 'school' || scope.studentIds.includes(studentId);
  const report = studentId && termId && allowedStudent
    ? await context.services.assessment.report(studentId, termId, familyView)
    : null;
  const refused = studentId > 0 && !allowedStudent
    ? 'You can only open a report for a linked student.'
    : null;
  return {
    students: visibleStudents,
    years,
    lines: report && 'lines' in report ? report.lines : [],
    message: refused ?? (report && 'error' in report ? report.error : null),
    studentId,
    termId,
  };
}

export default function ReportCardPage() {
  const data = useLoaderData<typeof loader>();
  const { t } = useLanguage();

  return (
    <PageFrame title={t('reportCard')} description={t('reportCardDescription')}>
      <Form method="get" className="flex flex-wrap items-center gap-2">
        <select name="studentId" defaultValue={data.studentId || ''} required aria-label={t('studentsList')} className="h-9 rounded-md border px-3 text-sm">
          {data.students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
        </select>
        <select name="termId" defaultValue={data.termId || ''} required aria-label={t('academicYear')} className="h-9 rounded-md border px-3 text-sm">
          {data.years.flatMap((year) => year.terms.map((term) => (
            <option key={term.id} value={term.id}>{year.name} / {term.name}</option>
          )))}
        </select>
        <Button type="submit">{t('reportCard')}</Button>
      </Form>
      {data.message ? <p className="text-sm">{data.message}</p> : null}
      {data.lines.length > 0 ? (
        <section className="space-y-2 print:block">
          <ul className="space-y-1 text-sm">
            {data.lines.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <Button type="button" onClick={() => window.print()}>{t('printReport')}</Button>
        </section>
      ) : null}
    </PageFrame>
  );
}
