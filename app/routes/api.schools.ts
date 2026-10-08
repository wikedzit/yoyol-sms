import type { LoaderFunctionArgs } from 'react-router';
import { AppError, errorResponse } from 'workers/kernel/app-error';
import { pageOf } from 'workers/kernel/openapi';

export async function loader({ request, context }: LoaderFunctionArgs) {
  if (!context.services.currentUserId) {
    return errorResponse(new AppError('unauthorized', 'Sign in is required.'));
  }
  const schools = await context.services.school.getAll();
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const page = pageOf(
    schools.map((item) => ({ id: item.id, name: item.name, status: item.status })),
    limit,
    offset,
  );
  return Response.json({
    ...page,
    generatedAt: new Date().toISOString(),
  });
}
