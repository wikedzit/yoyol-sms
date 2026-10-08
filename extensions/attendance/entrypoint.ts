import { defineModule } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import source from './yoyol.extension.json';

function linesOrEmpty(lines: string[], emptyKey: string) {
  if (lines.length === 0) {
    return [view.text(emptyKey)];
  }
  return lines.map((line) => ({ type: 'text' as const, value: line }));
}

const attendance = defineModule({
  manifest: source,
  async handlePage(request, context) {
    const roll = /^\/class\/(\d+)\/(\d{4}-\d{2}-\d{2})$/.exec(request.path);
    if (roll) {
      return classPage(context, Number(roll[1]), request.search, roll[2] ?? '');
    }
    return homePage(context);
  },
  async handleAction(_name, fields, context) {
    return context.attendance?.mark(fields) ?? { error: 'Attendance is not available.' };
  },
  async runHook(name, payload, context) {
    if (name === 'dashboard.widgets') {
      const lines = await context.attendance?.dashboardLines() ?? [];
      return {
        size: 'small',
        document: view.page('attendance.widget', linesOrEmpty(lines, 'attendance.widgetEmpty')),
      };
    }
    if (name === 'student.profile.tabs') {
      const rawId = payload && typeof payload === 'object' && 'studentId' in payload
        ? payload.studentId
        : null;
      const studentId = typeof rawId === 'number' && Number.isInteger(rawId) && rawId > 0 ? rawId : null;
      const lines = await context.attendance?.profileLines(studentId) ?? [];
      return {
        label: 'attendance.profile',
        document: view.page('attendance.profile', linesOrEmpty(lines, 'attendance.profileEmpty')),
      };
    }
    return null;
  },
});

async function homePage(context: Parameters<NonNullable<typeof attendance.handlePage>>[1]) {
  const classes = await context.attendance?.classes() ?? [];
  const today = await context.attendance?.today() ?? '';
  const summary = await context.attendance?.summary() ?? [];
  const canManage = await context.attendance?.canManage() ?? false;
  const settings = await context.attendance?.settings() ?? { editableDays: '7', absenceAlerts: 'off' };
  const body = [
    view.text('attendance.description'),
    {
      type: 'section' as const,
      heading: { t: 'attendance.summary' },
      body: linesOrEmpty(summary, 'attendance.summaryEmpty'),
    },
    {
      type: 'section' as const,
      heading: { t: 'attendance.roll' },
      body: classes.length === 0
        ? [view.text('attendance.empty')]
        : classes.map((formClass) => ({
          type: 'link' as const,
          label: formClass.name,
          href: `/x/attendance/class/${formClass.id}/${today}`,
        })),
    },
  ];
  if (canManage) {
    body.push({
      type: 'form',
      action: 'settings',
      method: 'post',
      submitLabel: { t: 'attendance.saveSettings' },
      fields: [
        {
          name: 'editableDays',
          kind: 'text',
          label: { t: 'attendance.editableDays' },
          value: settings.editableDays,
        },
        {
          name: 'absenceAlerts',
          kind: 'select',
          label: { t: 'attendance.alerts' },
          value: settings.absenceAlerts,
          options: [
            { value: 'off', label: { t: 'attendance.alertsOff' } },
            { value: 'on', label: { t: 'attendance.alertsOn' } },
          ],
        },
      ],
    });
  }
  return view.page('attendance.title', body);
}

async function classPage(
  context: Parameters<NonNullable<typeof attendance.handlePage>>[1],
  classId: number,
  search: string | undefined,
  pathDate: string,
) {
  const requested = new URLSearchParams(search ?? '').get('date');
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : pathDate;
  const roll = await context.attendance?.roll(classId, date);
  const canWrite = await context.attendance?.canWrite() ?? false;
  if (!roll || roll.error) {
    return view.page('attendance.title', [view.text(roll?.error ?? 'attendance.empty')]);
  }
  const body: Record<string, unknown>[] = [
    { type: 'text', value: `${roll.className}, ${roll.date}` },
    {
      type: 'form',
      action: `/x/attendance/class/${classId}/${pathDate}`,
      method: 'get',
      submitLabel: { t: 'attendance.open' },
      fields: [
        { name: 'date', kind: 'date', label: { t: 'attendance.date' }, value: roll.date },
      ],
    },
  ];
  if (roll.students.length === 0) {
    body.push(view.text('attendance.noStudents'));
  }
  if (canWrite && roll.students.length > 0) {
    body.push({
      type: 'button',
      label: { t: 'attendance.markClass' },
      action: 'class-present',
      values: { classId: String(classId), date: roll.date },
    });
  }
  for (const student of roll.students) {
    const status = student.status.length > 0 ? student.status : 'present';
    body.push({
      type: 'section',
      heading: student.name,
      body: canWrite
        ? [{
          type: 'form',
          action: 'mark',
          method: 'post',
          submitLabel: { t: 'attendance.save' },
          fields: [
            { name: 'studentId', kind: 'hidden', value: String(student.id) },
            { name: 'classId', kind: 'hidden', value: String(classId) },
            { name: 'date', kind: 'hidden', value: roll.date },
            {
              name: 'status',
              kind: 'select',
              label: { t: 'attendance.roll' },
              value: status,
              options: [
                { value: 'present', label: { t: 'attendance.present' } },
                { value: 'absent', label: { t: 'attendance.absent' } },
                { value: 'late', label: { t: 'attendance.late' } },
              ],
            },
            { name: 'comment', kind: 'text', label: { t: 'attendance.comment' }, value: student.comment },
          ],
        }]
        : [{ type: 'text', value: student.status.length > 0 ? `${student.status}${student.comment ? `, ${student.comment}` : ''}` : 'attendance.summaryEmpty' }],
    });
  }
  return view.page('attendance.roll', body);
}

export default attendance;
