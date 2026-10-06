import { Form, Link, useActionData, useSearchParams, type ActionFunctionArgs } from 'react-router';

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const token = String(form.get('token') || '');
  const password = String(form.get('password') || '');
  const result = await context.services.passwordResets.reset(token, password);
  if ('error' in result) return { error: result.error };

  await context.services.sessions.revokeAll(result.userId);
  await context.services.sessions.recordAudit({
    action: 'password_reset',
    userId: result.userId,
  });
  return { reset: true };
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const data = useActionData<typeof action>();
  return (
    <div className="w-full max-w-md bg-white rounded-3xl px-8 py-10">
      <h2 className="text-3xl font-bold text-black mb-3">Choose a new password</h2>
      {data && 'reset' in data ? (
        <p className="text-sm">
          Password updated. <Link to="/auth/login" className="text-purple-600 underline">Sign in</Link>
        </p>
      ) : (
        <Form method="post" className="space-y-4">
          <input type="hidden" name="token" defaultValue={params.get('token') || ''} />
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="New password"
            className="w-full px-4 py-2 border rounded-md"
          />
          <button type="submit" className="w-full bg-primary-gradient text-white py-2 rounded-[8px]">
            Update password
          </button>
          {data && 'error' in data && <p className="text-sm text-red-600">{data.error}</p>}
        </Form>
      )}
    </div>
  );
}
