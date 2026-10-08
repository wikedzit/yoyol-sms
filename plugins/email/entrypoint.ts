import { definePlugin } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import source from './yoyol.extension.json';

const email = definePlugin({
  manifest: source,
  async handlePage(_request, context) {
    const lines = await context.channels?.receipts('email') ?? [];
    return view.page('email.title', [
      view.text('email.description'),
      ...(lines.length === 0 ? [view.text('email.empty')] : lines.map((line) => ({ type: 'text' as const, value: line }))),
    ]);
  },
  runHook(name) {
    if (name === 'navigation.items') {
      return { label: 'email.title', href: '/x/email' };
    }
    return null;
  },
});

export default email;
