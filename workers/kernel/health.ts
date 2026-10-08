export type CheckState = 'ok' | 'down' | 'not_configured';

export type HealthReport = {
  status: 'ok' | 'down';
  checks: {
    app: 'ok';
    database: CheckState;
    queue: CheckState;
    extensionHost: CheckState;
  };
};

export function healthReport(checks: {
  database: CheckState;
  extensionHost: CheckState;
  queue?: CheckState;
}): HealthReport {
  const queue = checks.queue ?? 'not_configured';
  const ready = checks.database === 'ok' && checks.extensionHost === 'ok';
  return {
    status: ready ? 'ok' : 'down',
    checks: {
      app: 'ok',
      database: checks.database,
      queue,
      extensionHost: checks.extensionHost,
    },
  };
}
