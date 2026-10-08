import { definePlugin } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import source from './yoyol.extension.json';

const feeReminders = definePlugin({
  manifest: source,
  async handlePage() {
    return view.page('fee-reminders.title', [
      view.text('fee-reminders.description'),
      {
        type: 'form',
        action: 'remind',
        method: 'post',
        submitLabel: { t: 'fee-reminders.send' },
        fields: [],
      },
    ]);
  },
  async handleAction(action, _fields, context) {
    if (action !== 'remind') return { error: 'Choose an action.' };
    return context.channels?.remind() ?? { error: 'Fee reminders are not available.' };
  },
  runHook(name) {
    if (name === 'navigation.items') {
      return { label: 'fee-reminders.title', href: '/x/fee-reminders' };
    }
    return null;
  },
});

export default feeReminders;
