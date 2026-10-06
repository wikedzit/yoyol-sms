import { Form, Link, useActionData, type ActionFunctionArgs } from 'react-router';
import { RESET_MESSAGE } from 'workers/services/password-resets';

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const email = String(form.get('email') || '');
  const result = await context.services.passwordResets.request(email);
  if (result.devToken) {
    console.info(`Password reset token for local use: ${result.devToken}`);
  }
  return { message: RESET_MESSAGE };
}

export default function ForgotPasswordPage() {
  const data = useActionData<typeof action>();
  return (
    <div className="w-full max-w-md bg-white rounded-3xl px-8 py-10">
      <h2 className="text-3xl font-bold text-black mb-3">Reset password</h2>
      <p className="mb-5 text-sm text-gray-600">
        Enter the email on the account. The reply is the same whether or not that account exists.
      </p>
      <Form method="post" className="space-y-4">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          className="w-full px-4 py-2 border rounded-md"
        />
        <button type="submit" className="w-full bg-primary-gradient text-white py-2 rounded-[8px]">
          Send reset link
        </button>
      </Form>
      {data?.message && <p className="text-sm mt-4">{data.message}</p>}
      <p className="text-sm mt-4">
        <Link to="/auth/login" className="text-purple-600 underline">Back to login</Link>
      </p>
    </div>
  );
}
