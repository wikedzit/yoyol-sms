import { defineModule } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import type { ReportsPage } from '../../workers/kernel/reports';
import source from './yoyol.extension.json';

const reports = defineModule({
  manifest: source,
  async handlePage(_request, context) {
    const page = await context.reports?.open();
    if (!page) return view.page('reports.title', [view.text('reports.dashboardEmpty')]);
    return homeDocument(page);
  },
  async handleAction(_name, fields, context) {
    return context.reports?.save(fields) ?? { error: 'Reports are not available.' };
  },
  async runHook(name, _payload, context) {
    if (name !== 'dashboard.widgets') return null;
    const line = await context.reports?.roleLine();
    return {
      size: 'small',
      document: view.page('reports.title', [{ type: 'text', value: line || 'Reports' }]),
    };
  },
});

function homeDocument(page: ReportsPage) {
  const body: Record<string, unknown>[] = [
    view.text('reports.description'),
    {
      type: 'section',
      heading: { t: 'reports.dashboard' },
      body: page.widgets.length === 0
        ? [view.text('reports.dashboardEmpty')]
        : page.widgets.flatMap((widget) => [
          { type: 'text', value: widget.name },
          ...widget.lines.map((line) => ({ type: 'text', value: line })),
        ]),
    },
  ];
  if (!page.canManage) return view.page('reports.title', body);
  body.push({
    type: 'section',
    heading: { t: 'reports.transfer' },
    body: [
      ...page.previewLines.map((line) => ({ type: 'text', value: line })),
      ...(page.previewLines.length === 0 ? [view.text('reports.previewEmpty')] : []),
      {
        type: 'link',
        label: { t: 'reports.exportStudents' },
        href: '/reports/students.csv',
      },
      {
        type: 'link',
        label: { t: 'reports.exportStaff' },
        href: '/reports/staff.csv',
      },
      {
        type: 'link',
        label: { t: 'reports.exportFees' },
        href: '/reports/fees.csv',
      },
      {
        type: 'form',
        action: 'preview',
        method: 'post',
        submitLabel: { t: 'reports.preview' },
        fields: [
          {
            name: 'kind',
            kind: 'select',
            label: { t: 'reports.kind' },
            options: [
              { value: 'students', label: { t: 'reports.students' } },
              { value: 'staff', label: { t: 'reports.staff' } },
              { value: 'fees', label: { t: 'reports.fees' } },
            ],
          },
          { name: 'csv', kind: 'text', label: { t: 'reports.csv' } },
        ],
      },
      ...(page.previewReady ? [{
        type: 'button',
        label: { t: 'reports.save' },
        action: 'save',
        values: {},
      }] : []),
    ],
  });
  return view.page('reports.title', body);
}

export default reports;
