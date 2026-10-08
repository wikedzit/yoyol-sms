import { defineModule } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import type { LeadershipAppointment, LeadershipPage, LeadershipPosition } from '../../workers/kernel/leadership';
import source from './yoyol.extension.json';

const leadership = defineModule({
  manifest: source,
  async handlePage(_request, context) {
    const page = await context.leadership?.open();
    if (!page) return view.page('leadership.title', [view.text('leadership.holdersEmpty')]);
    return homeDocument(page);
  },
  async handleAction(_name, fields, context) {
    return context.leadership?.save(fields) ?? { error: 'Leadership is not available.' };
  },
});

function homeDocument(page: LeadershipPage) {
  const active = page.positions.filter((position) => !position.retired);
  const body: Record<string, unknown>[] = [
    view.text('leadership.description'),
    {
      type: 'section',
      heading: { t: 'leadership.positions' },
      body: page.positions.length === 0
        ? [view.text('leadership.positionsEmpty')]
        : page.positions.flatMap((position) => positionNodes(position, page.canManage)),
    },
  ];
  if (page.canManage) {
    body.push({
      type: 'form',
      action: 'position',
      method: 'post',
      submitLabel: { t: 'leadership.save' },
      fields: [{ name: 'name', kind: 'text', label: { t: 'leadership.name' } }],
    });
  }
  body.push({
    type: 'section',
    heading: { t: 'leadership.holders' },
    body: page.holders.length === 0
      ? [view.text('leadership.holdersEmpty')]
      : page.holders.map((line) => ({ type: 'text', value: line })),
  });
  body.push({
    type: 'section',
    heading: { t: 'leadership.appointments' },
    body: page.appointments.length === 0
      ? [view.text('leadership.appointmentsEmpty')]
      : page.appointments.flatMap((appointment) => appointmentNodes(appointment, page.canManage)),
  });
  if (page.canManage && active.length > 0 && page.students.length > 0) {
    body.push({
      type: 'form',
      action: 'appoint',
      method: 'post',
      submitLabel: { t: 'leadership.appoint' },
      fields: [
        {
          name: 'positionId',
          kind: 'select',
          label: { t: 'leadership.name' },
          options: active.map((position) => ({ value: String(position.id), label: position.name })),
        },
        {
          name: 'studentId',
          kind: 'select',
          label: { t: 'leadership.student' },
          options: page.students.map((student) => ({ value: String(student.id), label: student.name })),
        },
        { name: 'startsOn', kind: 'date', label: { t: 'leadership.starts' } },
        { name: 'endsOn', kind: 'date', label: { t: 'leadership.ends' } },
      ],
    });
  }
  return view.page('leadership.title', body);
}

function positionNodes(position: LeadershipPosition, canManage: boolean) {
  const nodes: Record<string, unknown>[] = [
    { type: 'text', value: position.retired ? `${position.name}, retired` : position.name },
  ];
  if (!canManage || position.retired) return nodes;
  nodes.push({
    type: 'form',
    action: 'position',
    method: 'post',
    submitLabel: { t: 'leadership.save' },
    fields: [
      { name: 'positionId', kind: 'hidden', value: String(position.id) },
      { name: 'name', kind: 'text', label: { t: 'leadership.name' }, value: position.name },
    ],
  });
  nodes.push({
    type: 'button',
    label: { t: 'leadership.retire' },
    action: 'retire',
    values: { positionId: String(position.id) },
  });
  return nodes;
}

function appointmentNodes(appointment: LeadershipAppointment, canManage: boolean) {
  const nodes: Record<string, unknown>[] = [{ type: 'text', value: appointment.line }];
  if (canManage && !appointment.ended) {
    nodes.push({
      type: 'button',
      label: { t: 'leadership.end' },
      action: 'end',
      values: { appointmentId: String(appointment.id) },
    });
  }
  return nodes;
}

export default leadership;
