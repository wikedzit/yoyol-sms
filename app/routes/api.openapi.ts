import { apiDocument } from 'workers/kernel/openapi';

export function loader() {
  return Response.json(apiDocument());
}
