import { Form, redirect, useActionData, useSearchParams, type ActionFunctionArgs } from 'react-router';
import { appendSetCookies, serializeSessionCookies } from 'workers/utils/cookies.server';

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const token = String(form.get('token') || '');
  const password = String(form.get('password') || '');
  const result = await context.services.invitations.accept(token, password);
  if ('error' in result) return { error: result.error };

  const user = await context.services.users.findUserById(result.userId);
  if (!user) return { error: 'Could not accept that invitation.' };

  const session = await context.services.sessions.start(user, request);
  await context.services.sessions.recordAudit({
    action: 'invitation_accepted',
    userId: user.id,
  });
  const headers = new Headers();
  appendSetCookies(headers, await serializeSessionCookies(session));
  return redirect('/', { headers });
}

export default function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const data = useActionData<typeof action>();
  return (
    <div className="w-full max-w-md bg-white rounded-3xl px-8 py-10">
      <h2 className="text-3xl font-bold text-black mb-3">Accept invitation</h2>
      <p className="mb-5 text-sm text-gray-600">Set a password to join the school.</p>
      <Form method="post" className="space-y-4">
        <input type="hidden" name="token" defaultValue={params.get('token') || ''} />
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Password"
          className="w-full px-4 py-2 border rounded-md"
        />
        <button type="submit" className="w-full bg-primary-gradient text-white py-2 rounded-[8px]">
          Join school
        </button>
        {data?.error && <p className="text-sm text-red-600">{data.error}</p>}
      </Form>
    </div>
  );
}
