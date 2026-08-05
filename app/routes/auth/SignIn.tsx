import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFetcher, useNavigation } from 'react-router';
import { authCookie } from 'workers/utils/cookies.server';
import { redirect } from 'react-router';
import { useState } from "react";
import { Eye, EyeOff } from 'lucide-react';

// 🧩 Zod validation schema
const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password too long'),
});

type FormData = z.infer<typeof schema>;

export async function action({ request, context }: any) {
  const form = await request.formData();
  const email = form.get('email');
  const password = form.get('password');

  const token = await context.services.users.login(email, password);
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Invalid email or password' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return redirect('/', {
    headers: {
      'Set-Cookie': await authCookie.serialize(token),
    },
  });
}

export default function LoginPage() {
  const [showpassword, setshowpassword] = useState(false);
  const fetcher = useFetcher();
  const navigation = useNavigation();
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
        <p className="mb-5 text-medium-gray max-w-[288px] text-sm">
          Welcome back! <br /> Login to view your dashboard.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

          <div>
            <label
              htmlFor="password"
              className="block text-sm mb-1 font-medium"
            >
              Password
            </label>
            <div className='relative'>
            <input
              id="password"
              type={showpassword ? 'text' : 'password'}
              {...register('password')}
              autoComplete="current-password"
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.password
                  ? 'border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:ring-purple-200'
              }`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setshowpassword(!showpassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showpassword ? (
                  <Eye className="w-5 h-5"/>
                ):(
                   <EyeOff className="w-5 h-5"/>
                )}
              </button>
              </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-gradient text-white py-2 rounded-[8px] hover:opacity-90 disabled:opacity-50 transition-opacity  cursor-pointer"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>

          {fetcher.data?.error && (
            <p className="text-red-600 text-center text-sm mt-2">
              {fetcher.data.error}
            </p>
          )}
          {/* 
          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?
            <a
              href="/signup"
              className="text-purple-600 ml-1 underline hover:text-purple-700"
            >
              Create an account
            </a>
          </p> */}
        </form>
      </div>
    </div>
  );
}