import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Link,
  redirect,
  useActionData,
  useNavigation,
  useSubmit,
  type ActionFunctionArgs,
} from "react-router";
import { authCookie, pendingAuthCookie } from "workers/utils/cookies.server";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password too long"),
});

type SignInFormValues = z.infer<typeof signInSchema>;
type SignInActionData = {
  error?: string;
  twoFactorRequired?: boolean;
};

function fieldClassName(hasError: boolean) {
  const ringColor = hasError
    ? "border-red-500 focus:ring-red-200"
    : "border-gray-300 focus:ring-purple-200";

  return `w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${ringColor}`;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();

  if (form.get("step") === "two_factor") {
    const pendingToken = String(
      form.get("pendingToken") ||
        (await pendingAuthCookie.parse(request.headers.get("Cookie") || "")) ||
        "",
    );
    const sessionToken = await context.services.users.completeTwoFactorLogin(
      pendingToken,
      String(form.get("code") || ""),
    );
    if (!sessionToken) {
      return { error: "Invalid authentication code", twoFactorRequired: true };
    }

    return redirect("/", {
      headers: [
        ["Set-Cookie", await authCookie.serialize(sessionToken)],
        ["Set-Cookie", await pendingAuthCookie.serialize("", { maxAge: 0 })],
      ],
    });
  }

  const parsed = signInSchema.safeParse({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const loginResult = await context.services.users.login(
    parsed.data.email,
    parsed.data.password,
  );

  if (!loginResult) {
    return { error: "Invalid email or password" };
  }

  if ("twoFactorRequired" in loginResult) {
    return Response.json(
      { twoFactorRequired: true },
      {
        headers: {
          "Set-Cookie": await pendingAuthCookie.serialize(
            loginResult.pendingToken,
          ),
        },
      },
    );
  }

  return redirect("/", {
    headers: {
      "Set-Cookie": await authCookie.serialize(loginResult.token),
    },
  });
}

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const actionData = useActionData<SignInActionData>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSubmitting = navigation.state !== "idle";
  const requiresTwoFactor = Boolean(actionData?.twoFactorRequired);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
  });

  const submitSignIn = (values: SignInFormValues) => {
    submit(values, { method: "POST" });
  };

  const submitTwoFactor = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(
      { step: "two_factor", code: twoFactorCode },
      { method: "POST" },
    );
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
        <h2 className="text-3xl font-bold text-black mb-3">Login</h2>
        <p className="mb-5 text-medium-gray max-w-[288px] text-sm">
          Welcome back! <br /> Login to view your dashboard.
        </p>

        <form onSubmit={handleSubmit(submitSignIn)} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm mb-1 font-medium">
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
              className="block text-sm mb-1 font-medium"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                {...register("password")}
                autoComplete="current-password"
                className={`${fieldClassName(Boolean(errors.password))} pr-10`}
                placeholder="Enter your password"
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-gradient text-white py-2 rounded-[8px] hover:opacity-90 disabled:opacity-50 transition-opacity  cursor-pointer"
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </button>

          {actionData?.error && (
            <p className="text-red-600 text-center text-sm mt-2">
              {actionData.error}
            </p>
          )}

          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?
            <Link
              to="/auth/signup"
              className="text-purple-600 ml-1 underline hover:text-purple-700"
            >
              Create an account
            </Link>
          </p>
        </form>
        )}

        {requiresTwoFactor && actionData?.error && (
          <p className="text-red-600 text-center text-sm mt-2">
            {actionData.error}
          </p>
        )}
      </div>
    </div>
  );
}
