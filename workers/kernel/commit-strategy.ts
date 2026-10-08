export type DatabaseEngine = 'd1' | 'postgres';

export type CommitStatement = {
  sql: string;
  params: readonly unknown[];
};

export type CommitRequest = {
  statements: readonly CommitStatement[];
  after?: () => Promise<void>;
  undo?: readonly CommitStatement[];
};

export function commitStyle(engine: DatabaseEngine): 'transaction' | 'batch' {
  if (engine === 'postgres') {
    return 'transaction';
  }
  return 'batch';
}

export async function runCommit(input: {
  engine: DatabaseEngine;
  request: CommitRequest;
  apply: (statements: readonly CommitStatement[]) => Promise<void>;
  rollback: () => Promise<void>;
}): Promise<void> {
  if (commitStyle(input.engine) === 'transaction') {
    try {
      await input.apply(input.request.statements);
      await input.request.after?.();
    } catch (error) {
      await input.rollback();
      throw error;
    }
    return;
  }

  await input.apply(input.request.statements);
  try {
    await input.request.after?.();
  } catch (error) {
    if (input.request.undo && input.request.undo.length > 0) {
      await input.apply(input.request.undo);
    }
    throw error;
  }
}
