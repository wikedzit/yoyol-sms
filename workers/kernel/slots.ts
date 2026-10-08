export const coreSlotNames = [
  'student.profile.tabs',
  'dashboard.widgets',
  'navigation.items',
] as const;

export type CoreSlotName = (typeof coreSlotNames)[number];

export type SlotContribution = {
  extensionKey: string;
  priority: number;
  label: string | null;
  href: string | null;
  document: unknown | null;
};

type SlotHandler = {
  extensionKey: string;
  priority: number;
  run: () => Promise<unknown>;
};

export async function collectSlotContributions(input: {
  slotName: string;
  handlers: readonly SlotHandler[];
  budgetMs?: number;
  log?: (message: string) => void;
}): Promise<SlotContribution[]> {
  const budgetMs = input.budgetMs ?? 50;
  const ordered = input.handlers
    .map((handler, index) => ({ handler, index }))
    .sort((left, right) => left.handler.priority - right.handler.priority || left.index - right.index);
  const contributions: SlotContribution[] = [];

  for (const { handler } of ordered) {
    try {
      const value = await withBudget(handler.run(), budgetMs);
      const contribution = readSlotContribution(input.slotName, handler.extensionKey, handler.priority, value);
      if (contribution) {
        contributions.push(contribution);
      } else {
        input.log?.(`Slot ${input.slotName} from ${handler.extensionKey} was skipped because it was invalid.`);
      }
    } catch (error) {
      const reason = error instanceof Error && error.message === 'timedOut' ? 'ran too long' : 'failed';
      input.log?.(`Slot ${input.slotName} from ${handler.extensionKey} was skipped because it ${reason}.`);
    }
  }

  return contributions;
}

export function readSlotContribution(
  slotName: string,
  extensionKey: string,
  priority: number,
  value: unknown,
): SlotContribution | null {
  if (!(coreSlotNames as readonly string[]).includes(slotName) || value == null) {
    return null;
  }

  if (slotName === 'navigation.items') {
    if (!isRecord(value) || typeof value.label !== 'string' || !isAppHref(value.href)) {
      return null;
    }
    return { extensionKey, priority, label: value.label, href: value.href, document: null };
  }

  const document = slotName === 'dashboard.widgets' && isViewDocument(value)
    ? value
    : isRecord(value) && isViewDocument(value.document)
      ? value.document
      : null;
  if (!document) {
    return null;
  }
  const label = isRecord(value) && typeof value.label === 'string' ? value.label : null;
  if (slotName === 'student.profile.tabs' && !label) {
    return null;
  }
  return { extensionKey, priority, label, href: null, document };
}

function isAppHref(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('://');
}

function isViewDocument(value: unknown): boolean {
  return isRecord(value) && value.viewVersion === 1 && Array.isArray(value.body);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function withBudget<T>(work: Promise<T>, budgetMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timedOut')), budgetMs);
    work.then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
