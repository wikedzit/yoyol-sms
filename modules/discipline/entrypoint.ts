import { defineModule } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import type { DisciplineIncident, DisciplineKind, DisciplinePage } from '../../workers/kernel/discipline';
import source from './yoyol.extension.json';

const discipline = defineModule({
  manifest: source,
  async handlePage(_request, context) {
    const page = await context.discipline?.open();
    if (!page) return view.page('discipline.title', [view.text('discipline.incidentsEmpty')]);
    return homeDocument(page);
  },
  async handleAction(_name, fields, context) {
    return context.discipline?.save(fields) ?? { error: 'Discipline is not available.' };
  },
});

function homeDocument(page: DisciplinePage) {
  const activeTypes = page.types.filter((item) => item.active);
  const activeSeverities = page.severities.filter((item) => item.active);
  const body: Record<string, unknown>[] = [
    view.text('discipline.description'),
    kindSection('discipline.types', 'discipline.typesEmpty', page.types, page.canManage, 'type'),
    kindSection('discipline.severities', 'discipline.severitiesEmpty', page.severities, page.canManage, 'severity'),
    {
      type: 'section',
      heading: { t: 'discipline.incidents' },
      body: page.incidents.length === 0
        ? [view.text('discipline.incidentsEmpty')]
        : page.incidents.flatMap((incident) => incidentNodes(incident, page.canManage)),
    },
  ];
  if (page.canRecord && activeTypes.length > 0 && activeSeverities.length > 0 && page.students.length > 0) {
    body.push({
      type: 'form',
      action: 'incident',
      method: 'post',
      submitLabel: { t: 'discipline.saveIncident' },
      fields: [
        {
          name: 'studentId',
          kind: 'select',
          label: { t: 'discipline.student' },
          options: page.students.map((student) => ({ value: String(student.id), label: student.name })),
        },
        {
          name: 'typeId',
          kind: 'select',
          label: { t: 'discipline.type' },
          options: activeTypes.map((item) => ({ value: String(item.id), label: item.name })),
        },
        {
          name: 'severityId',
          kind: 'select',
          label: { t: 'discipline.severity' },
          options: activeSeverities.map((item) => ({ value: String(item.id), label: item.name })),
        },
        { name: 'incidentDate', kind: 'date', label: { t: 'discipline.date' } },
        { name: 'description', kind: 'text', label: { t: 'discipline.whatHappened' } },
        { name: 'actionTaken', kind: 'text', label: { t: 'discipline.actionTaken' } },
      ],
    });
  }
  return view.page('discipline.title', body);
}

function kindSection(
  heading: string,
  emptyKey: string,
  kinds: DisciplineKind[],
  canManage: boolean,
  kind: 'type' | 'severity',
) {
  const nodes: Record<string, unknown>[] = kinds.length === 0
    ? [view.text(emptyKey)]
    : kinds.flatMap((item) => kindNodes(item, canManage, kind));
  if (canManage) {
    nodes.push({
      type: 'form',
      action: kind,
      method: 'post',
      submitLabel: { t: 'discipline.save' },
      fields: [{ name: 'name', kind: 'text', label: { t: 'discipline.name' } }],
    });
  }
  return { type: 'section', heading: { t: heading }, body: nodes };
}

function kindNodes(item: DisciplineKind, canManage: boolean, kind: 'type' | 'severity') {
  const nodes: Record<string, unknown>[] = [
    { type: 'text', value: item.active ? item.name : `${item.name}, inactive` },
  ];
  if (!canManage || !item.active) return nodes;
  nodes.push({
    type: 'form',
    action: kind,
    method: 'post',
    submitLabel: { t: 'discipline.save' },
    fields: [
      { name: 'kindId', kind: 'hidden', value: String(item.id) },
      { name: 'name', kind: 'text', label: { t: 'discipline.name' }, value: item.name },
    ],
  });
  nodes.push({
    type: 'button',
    label: { t: 'discipline.deactivate' },
    action: kind === 'type' ? 'deactivate-type' : 'deactivate-severity',
    values: kind === 'type' ? { typeId: String(item.id) } : { severityId: String(item.id) },
  });
  return nodes;
}

function incidentNodes(incident: DisciplineIncident, canManage: boolean) {
  const nodes: Record<string, unknown>[] = [
    { type: 'text', value: incident.line },
    { type: 'text', value: incident.description },
    { type: 'text', value: incident.actionTaken },
  ];
  if (incident.canUpdate) {
    nodes.push({
      type: 'form',
      action: 'incident',
      method: 'post',
      submitLabel: { t: 'discipline.saveIncident' },
      fields: [
        { name: 'incidentId', kind: 'hidden', value: String(incident.id) },
        { name: 'typeId', kind: 'hidden', value: String(incident.typeId) },
        { name: 'severityId', kind: 'hidden', value: String(incident.severityId) },
        { name: 'studentId', kind: 'hidden', value: String(incident.studentId) },
        { name: 'incidentDate', kind: 'date', label: { t: 'discipline.date' }, value: incident.incidentDate },
        { name: 'description', kind: 'text', label: { t: 'discipline.whatHappened' }, value: incident.description },
        { name: 'actionTaken', kind: 'text', label: { t: 'discipline.actionTaken' }, value: incident.actionTaken },
      ],
    });
  }
  if (canManage && !incident.closed) {
    nodes.push({
      type: 'button',
      label: { t: 'discipline.close' },
      action: 'close',
      values: { incidentId: String(incident.id) },
    });
  }
  return nodes;
}

export default discipline;
