import { defineModule } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import source from './yoyol.extension.json';

function linesOrEmpty(lines: string[], emptyKey: string) {
  if (lines.length === 0) {
    return [view.text(emptyKey)];
  }
  return lines.map((line) => ({ type: 'text' as const, value: line }));
}

const students = defineModule({
  manifest: source,
  pages: {
    '/': async (context) => {
      const records = await context.core.students?.records?.() ?? [];
      const enrolments = await context.core.students?.enrolments?.() ?? [];
      return view.page('students.title', [
        view.text('students.description'),
        {
          type: 'section',
          heading: { t: 'students.records' },
          body: linesOrEmpty(records, 'students.empty'),
        },
        {
          type: 'section',
          heading: { t: 'students.enrolments' },
          body: linesOrEmpty(enrolments, 'students.enrolmentsEmpty'),
        },
        {
          type: 'section',
          heading: { t: 'students.guardians' },
          body: linesOrEmpty(await context.core.students?.guardians?.() ?? [], 'students.guardiansEmpty'),
        },
        {
          type: 'section',
          heading: { t: 'students.subjects' },
          body: linesOrEmpty(await context.core.students?.yearSubjects?.() ?? [], 'students.subjectsEmpty'),
        },
        {
          type: 'section',
          heading: { t: 'students.results' },
          body: linesOrEmpty(await context.core.students?.results?.() ?? [], 'students.resultsEmpty'),
        },
      ]);
    },
  },
});

export default students;
