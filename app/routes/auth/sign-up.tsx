import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Link,
  redirect,
  useFetcher,
  useNavigation,
  type ActionFunctionArgs,
} from "react-router";
import { authCookie } from "workers/utils/cookies.server";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const signUpSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password too long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpFormValues = z.infer<typeof signUpSchema>;
type SignUpActionData = { error?: string };

function jsonErrorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fieldClassName(hasError: boolean) {
  const ringColor = hasError
    ? "border-red-500 focus:ring-red-200"
    : "border-gray-300 focus:ring-purple-200";

  return `w-full px-4 py-2 border rounded-md bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 ${ringColor}`;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const parsed = signUpSchema.safeParse({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    confirmPassword: String(form.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return jsonErrorResponse(
      parsed.error.issues[0]?.message ?? "Invalid input",
      400,
    );
  }

  const result = await context.services.users.signup(
    parsed.data.email,
    parsed.data.password,
  );

  if ("error" in result) {
    return jsonErrorResponse(result.error, 409);
  }

  return redirect("/", {
    headers: {
      "Set-Cookie": await authCookie.serialize(result.token),
    },
  });
}

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fetcher = useFetcher<SignUpActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
  });

  const submitSignUp = (values: SignUpFormValues) => {
    fetcher.submit(values, { method: "POST" });
  };

  return (
    <div
      className="w-full max-w-md bg-white rounded-3xl"
      style={{
        boxShadow:
          "0px 8px 10px -6px rgba(0, 0, 0, 0.1), 0px 20px 25px -5px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className="px-5 md:px-10 py-10">
        <h2 className="text-3xl font-bold text-black mb-3">Sign up</h2>
        <p className="mb-5 text-medium-gray max-w-[288px] text-sm">
          Create your account <br /> to start using the dashboard.
        </p>

        <form onSubmit={handleSubmit(submitSignUp)} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm mb-1 font-medium text-gray-800"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              autoComplete="email"
              className={fieldClassName(Boolean(errors.email))}
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
              className="block text-sm mb-1 font-medium text-gray-800"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                autoComplete="new-password"
                className={`${fieldClassName(Boolean(errors.password))} pr-10`}
                placeholder="Create a password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? (
                  <Eye className="w-5 h-5 cursor-pointer" />
                ) : (
                  <EyeOff className="w-5 h-5 cursor-pointer" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm mb-1 font-medium text-gray-800"
            >
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirmPassword")}
                autoComplete="new-password"
                className={`${fieldClassName(Boolean(errors.confirmPassword))} pr-10`}
                placeholder="Re-enter your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showConfirmPassword ? (
                  <Eye className="w-5 h-5 cursor-pointer" />
                ) : (
                  <EyeOff className="w-5 h-5 cursor-pointer" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-gradient text-white py-2 rounded-[8px] hover:opacity-90 disabled:opacity-50 transition-opacity  cursor-pointer"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>

          {fetcher.data?.error && (
            <p className="text-red-600 text-center text-sm mt-2">
              {fetcher.data.error}
            </p>
          )}

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?
            <Link
              to="/auth/login"
              className="text-purple-600 ml-1 underline hover:text-purple-700"
            >
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
