import { defineModule } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import { weekDays, type TimetablePage } from '../../workers/kernel/timetable';
import source from './yoyol.extension.json';

const timetable = defineModule({
  manifest: source,
  async handlePage(_request, context) {
    const page = await context.timetable?.open();
    if (!page) return view.page('timetable.title', [view.text('timetable.weekEmpty')]);
    return homeDocument(page);
  },
  async handleAction(_name, fields, context) {
    return context.timetable?.save(fields) ?? { error: 'The timetable is not available.' };
  },
  async runHook(name, payload, context) {
    if (name !== 'student.profile.tabs') return null;
    const rawId = payload && typeof payload === 'object' && 'studentId' in payload ? payload.studentId : null;
    const studentId = typeof rawId === 'number' && Number.isInteger(rawId) && rawId > 0 ? rawId : null;
    const lines = await context.timetable?.profileLines(studentId) ?? [];
    return {
      label: 'timetable.profile',
      document: view.page('timetable.profile', lines.length === 0
        ? [view.text('timetable.profileEmpty')]
        : lines.map((line) => ({ type: 'text' as const, value: line }))),
    };
  },
});

function homeDocument(page: TimetablePage) {
  const body: Record<string, unknown>[] = [
    view.text('timetable.description'),
    {
      type: 'section',
      heading: { t: 'timetable.periods' },
      body: page.periods.length === 0
        ? [view.text('timetable.periodsEmpty')]
        : page.periods.flatMap((period) => [
          { type: 'text', value: `${period.name}, ${period.startsAt}-${period.endsAt}` },
          ...(page.canWrite ? [
            {
              type: 'form',
              action: 'period',
              method: 'post',
              submitLabel: { t: 'timetable.savePeriod' },
              fields: [
                { name: 'periodId', kind: 'hidden', value: String(period.id) },
                { name: 'name', kind: 'text', label: { t: 'timetable.periodName' }, value: period.name },
                { name: 'startsAt', kind: 'text', label: { t: 'timetable.starts' }, value: period.startsAt },
                { name: 'endsAt', kind: 'text', label: { t: 'timetable.ends' }, value: period.endsAt },
              ],
            },
            {
              type: 'button',
              label: { t: 'timetable.removePeriod' },
              action: 'remove-period',
              values: { periodId: String(period.id) },
            },
          ] : []),
        ]),
    },
  ];
  if (page.canWrite) {
    body.push({
      type: 'form',
      action: 'period',
      method: 'post',
      submitLabel: { t: 'timetable.savePeriod' },
      fields: [
        { name: 'name', kind: 'text', label: { t: 'timetable.periodName' } },
        { name: 'startsAt', kind: 'text', label: { t: 'timetable.starts' } },
        { name: 'endsAt', kind: 'text', label: { t: 'timetable.ends' } },
      ],
    });
  }
  body.push({
    type: 'section',
    heading: { t: 'timetable.week' },
    body: page.lessons.length === 0
      ? [view.text('timetable.weekEmpty')]
      : page.lessons.flatMap((lesson) => [
        { type: 'text', value: lesson.line },
        ...(page.canWrite ? [{
          type: 'button',
          label: { t: 'timetable.removeLesson' },
          action: 'remove-lesson',
          values: { lessonId: String(lesson.id) },
        }] : []),
      ]),
  });
  if (page.canWrite && page.periods.length > 0) {
    body.push({
      type: 'form',
      action: 'lesson',
      method: 'post',
      submitLabel: { t: 'timetable.saveLesson' },
      fields: [
        {
          name: 'subjectId',
          kind: 'select',
          label: { t: 'timetable.subject' },
          options: page.subjects.map((item) => ({ value: String(item.id), label: item.name })),
        },
        {
          name: 'teacherId',
          kind: 'select',
          label: { t: 'timetable.teacher' },
          options: page.teachers.map((item) => ({ value: String(item.id), label: item.name })),
        },
        {
          name: 'formClassId',
          kind: 'select',
          label: { t: 'timetable.class' },
          options: page.classes.map((item) => ({ value: String(item.id), label: item.name })),
        },
        {
          name: 'day',
          kind: 'select',
          label: { t: 'timetable.day' },
          options: weekDays.map((day) => ({ value: day, label: { t: `timetable.${day}` } })),
        },
        {
          name: 'periodId',
          kind: 'select',
          label: { t: 'timetable.periodName' },
          options: page.periods.map((period) => ({ value: String(period.id), label: period.name })),
        },
      ],
    });
  }
  return view.page('timetable.title', body);
}

export default timetable;
