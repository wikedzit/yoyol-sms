import { useNavigation, useFetcher, Form } from 'react-router';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppleID, Facebook, Google } from '~/svg/socialLinks/icons';

// 🧩 Zod validation schema
const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password too long'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const isSubmitting = navigation.state === 'submitting';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur', // validate on blur
  });

  const onSubmit = (data: FormData) => {
    // ✅ Only submit if valid
    fetcher.submit(data, { method: 'POST' });
  };

  return (
    <div
      className="w-full max-w-md bg-white rounded-3xl"
      style={{
        boxShadow:
          '0px 8px 10px -6px rgba(0, 0, 0, 0.1), 0px 20px 25px -5px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="px-5 md:px-10 py-10">
        <h2 className="text-3xl font-bold text-black mb-3">Login</h2>
        <p className="mb-5 text-medium-gray max-w-[288px]">
          Welcome back to your Student Management System! Login to view your
          dashboard.
        </p>

        <Form
          method="POST"
          className="space-y-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm mb-1 font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              autoComplete="email"
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.email
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-purple-200'
              }`}
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm mb-1 font-medium"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register('password')}
              autoComplete="new-password"
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.password
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-purple-200'
              }`}
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-gradient text-white py-2 rounded-md hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>

          {/* Divider */}
          <div className="flex items-center justify-center text-sm">
            <span className="border-t w-1/2" />
            <span className="mx-3 text-nowrap text-medium-gray text-sm">
              Or Sign in with
            </span>
            <span className="border-t w-1/2" />
          </div>

          {/* Social Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              className="flex-1 border rounded-[8px] py-2 flex items-center justify-center gap-2 text-sm font-medium transition text-primary hover:bg-[var(--color-bg-light)] duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]"
            >
              <Google color="currentColor" />
              <span className="hidden md:block mt-1">Google</span>
            </button>
            <button
              type="button"
              className="flex-1 border rounded-[8px] py-2 flex items-center justify-center gap-2 text-sm font-medium transition text-primary hover:bg-[var(--color-bg-light)] duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]"
            >
              <AppleID color="currentColor" />
              <span className="hidden md:block mt-1">Apple ID</span>
            </button>
            <button
              type="button"
              className="flex-1 border rounded-[8px] py-2 flex items-center justify-center gap-2 text-sm font-medium transition text-primary hover:bg-[var(--color-bg-light)] duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]"
            >
              <Facebook color="currentColor" />
              <span className="hidden md:block mt-1">Facebook</span>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500">
            Don’t have an account?
            <a href="/signup.parent" className="text-purple-600 ml-1 underline">
              Create an account
            </a>
          </p>
        </Form>
      </div>
    </div>
  );
}
