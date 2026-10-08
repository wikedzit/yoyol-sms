import type { LifecycleContext } from './sdk';

export type SentNotification = {
  userId: number;
  title: string;
  body: string;
};

export type FakeCore = LifecycleContext & {
  notificationsSent: SentNotification[];
};

export function fakeExtensionContext(input: {
  schoolId?: number;
  settings?: Record<string, string | null>;
  students?: unknown[];
  grants?: readonly string[];
} = {}): FakeCore {
  const grants = new Set(input.grants ?? []);
  const settings = input.settings ?? {};
  const notificationsSent: SentNotification[] = [];
  const context: FakeCore = {
    schoolId: input.schoolId ?? 1,
    settings: {
      get: async (key) => (key in settings ? settings[key] : null),
    },
    core: {},
    notificationsSent,
    log: { info() {}, error() {} },
  };

  if (grants.has('core.students:read')) {
    context.core.students = {
      list: async () => input.students ?? [],
    };
  }
  if (grants.has('notifications:send')) {
    context.notifications = {
      send: async (message) => {
        notificationsSent.push(message);
      },
    };
  }

  return context;
}
