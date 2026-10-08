import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ context }: LoaderFunctionArgs) {
  const report = await context.services.reportHealth();
  return Response.json(report, { status: report.status === 'ok' ? 200 : 503 });
}
