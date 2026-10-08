export function pageOf<T>(rows: readonly T[], limit: number, offset: number): {
  data: T[];
  page: { limit: number; offset: number; total: number };
} {
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit) || 20));
  const safeOffset = Math.max(0, Math.trunc(offset) || 0);
  return {
    data: rows.slice(safeOffset, safeOffset + safeLimit),
    page: { limit: safeLimit, offset: safeOffset, total: rows.length },
  };
}

export function apiDocument(): {
  openapi: '3.1.0';
  info: { title: string; version: string };
  paths: Record<string, unknown>;
} {
  return {
    openapi: '3.1.0',
    info: { title: 'YOYOL API', version: '1.0.0' },
    paths: {
      '/api/v1/schools': {
        get: {
          summary: 'Schools the signed-in person belongs to',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'offset', in: 'query', schema: { type: 'integer' } },
          ],
          responses: {
            '200': { description: 'A page of schools' },
            '401': { description: 'Sign in is required' },
          },
        },
      },
    },
  };
}
