import { defineModule } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import source from './yoyol.extension.json';

function linesOrEmpty(lines: string[], emptyKey: string) {
  if (lines.length === 0) {
    return [view.text(emptyKey)];
  }
  return lines.map((line) => ({ type: 'text' as const, value: line }));
}

const academics = defineModule({
  manifest: source,
  pages: {
    '/': async (context) => {
      const structure = await context.core.academics?.list() ?? [];
      const calendar = await context.core.academics?.calendar() ?? [];
      const subjects = await context.core.academics?.subjects() ?? [];
      const classSubjects = await context.core.academics?.classSubjects() ?? [];
      const combinations = await context.core.academics?.combinations() ?? [];
      return view.page('academics.title', [
        view.text('academics.description'),
        {
          type: 'section',
          heading: { t: 'academics.structure' },
          body: linesOrEmpty(structure, 'academics.empty'),
        },
        {
          type: 'section',
          heading: { t: 'academics.calendar' },
          body: linesOrEmpty(calendar, 'academics.calendarEmpty'),
        },
        {
          type: 'section',
          heading: { t: 'academics.subjects' },
          body: linesOrEmpty(subjects, 'academics.subjectsEmpty'),
        },
        {
          type: 'section',
          heading: { t: 'academics.classSubjects' },
          body: linesOrEmpty(classSubjects, 'academics.classSubjectsEmpty'),
        },
        {
          type: 'section',
          heading: { t: 'academics.combinations' },
          body: linesOrEmpty(combinations, 'academics.combinationsEmpty'),
        },
      ]);
    },
  },
});

export default academics;
