import { redirect, type LoaderFunctionArgs } from 'react-router';

export function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return redirect(`/modules${url.search}`);
}
