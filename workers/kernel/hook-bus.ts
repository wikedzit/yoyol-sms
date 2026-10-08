export type HookHandler = {
  extensionKey: string;
  priority: number;
  run: (payload: unknown) => Promise<unknown>;
};

export type SkippedHook = {
  extensionKey: string;
  reason: 'failed' | 'timedOut';
};

export type HookRun = {
  value: unknown;
  skipped: SkippedHook[];
  stopped: boolean;
  fieldErrors: Record<string, { en: string; sw: string }>;
};

const defaultBudgetMs = 50;

export async function runHook(input: {
  hookName: string;
  handlers: readonly HookHandler[];
  payload: unknown;
  mode?: 'filter' | 'blocking';
  budgetMs?: number;
  log?: (message: string) => void;
}): Promise<HookRun> {
  const budgetMs = input.budgetMs ?? defaultBudgetMs;
  const log = input.log ?? ((message) => console.error(message));
  const ordered = input.handlers
    .map((handler, index) => ({ handler, index }))
    .sort((left, right) => left.handler.priority - right.handler.priority || left.index - right.index);

  let value = input.payload;
  const skipped: SkippedHook[] = [];

  for (const { handler } of ordered) {
    try {
      const next = await withBudget(handler.run(value), budgetMs);
      if (input.mode === 'blocking' && hasFieldErrors(next)) {
        return { value, skipped, stopped: true, fieldErrors: next.fieldErrors };
      }
      value = next;
    } catch (error) {
      const reason = error instanceof Error && error.message === 'timedOut' ? 'timedOut' : 'failed';
      skipped.push({ extensionKey: handler.extensionKey, reason });
      log(`Hook ${input.hookName} from ${handler.extensionKey} was skipped because it ${reason === 'timedOut' ? 'ran too long' : 'failed'}.`);
    }
  }

  return { value, skipped, stopped: false, fieldErrors: {} };
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

function hasFieldErrors(value: unknown): value is { fieldErrors: Record<string, { en: string; sw: string }> } {
  if (!value || typeof value !== 'object' || !('fieldErrors' in value)) {
    return false;
  }
  const fieldErrors = value.fieldErrors;
  return !!fieldErrors && typeof fieldErrors === 'object' && Object.keys(fieldErrors).length > 0;
}
