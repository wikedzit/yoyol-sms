import { definePlugin } from '../../workers/kernel/sdk';
import { view } from '../../workers/kernel/view-document';
import source from './yoyol.extension.json';

const helloPage = view.page('hello.title', [view.text('hello.description')]);

const hello = definePlugin({
  manifest: source,
  handlePage() {
    return helloPage;
  },
  runHook(name) {
    if (name === 'dashboard.widgets') {
      return { size: 'small', document: helloPage };
    }
    if (name === 'navigation.items') {
      return { label: 'hello.title', href: '/x/hello' };
    }
    if (name === 'student.profile.tabs') {
      return { label: 'hello.title', document: helloPage };
    }
    return null;
  },
});

export default hello;
