import { defineModule } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import source from './yoyol.extension.json';

function linesOrEmpty(lines: string[], emptyKey: string) {
  if (lines.length === 0) {
    return [view.text(emptyKey)];
  }
  return lines.map((line) => ({ type: 'text' as const, value: line }));
}

export default defineModule({
  manifest: source,
  async runHook(name, _payload, context) {
    if (name !== 'dashboard.widgets') {
      return null;
    }
    const lines = await context.core.academics?.events?.() ?? [];
    return {
      size: 'small',
      document: view.page('notices.upcoming', linesOrEmpty(lines, 'notices.upcomingEmpty')),
    };
  },
});
