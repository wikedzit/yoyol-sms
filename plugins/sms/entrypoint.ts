import { definePlugin } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import source from './yoyol.extension.json';

const sms = definePlugin({
  manifest: source,
  async handlePage(_request, context) {
    const lines = await context.channels?.receipts('sms') ?? [];
    return view.page('sms.title', [
      view.text('sms.description'),
      ...(lines.length === 0 ? [view.text('sms.empty')] : lines.map((line) => ({ type: 'text' as const, value: line }))),
    ]);
  },
  runHook(name) {
    if (name === 'navigation.items') {
      return { label: 'sms.title', href: '/x/sms' };
    }
    return null;
  },
});

export default sms;
