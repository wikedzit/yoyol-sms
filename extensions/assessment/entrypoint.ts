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
  async runHook(name, payload, context) {
    if (name !== 'student.profile.tabs') {
      return null;
    }
    const lines = await context.core.students?.results?.() ?? [];
    const studentName = payload && typeof payload === 'object' && 'studentName' in payload
      ? payload.studentName
      : null;
    const visible = typeof studentName === 'string' && studentName.length > 0
      ? lines.filter((line) => line.startsWith(`${studentName},`) || line.startsWith(`${studentName}:`))
      : lines;
    return {
      label: 'assessment.results',
      document: view.page('assessment.results', linesOrEmpty(visible, 'assessment.resultsEmpty')),
    };
  },
});
