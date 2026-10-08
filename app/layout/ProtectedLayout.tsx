import { redirect, type LoaderFunctionArgs } from "react-router";
import { authCookie } from "workers/utils/cookies.server";
import jwt from "@tsndr/cloudflare-worker-jwt";
import { useLoaderData, Outlet } from "react-router";
import {
  getOwnerOnboardingStatus,
  hasFinishedOnboarding,
} from "~/lib/onboarding.server";

interface UserPayload {
  id: number;
  email: string;
  role: string;
}

interface LoaderData {
  user: UserPayload;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const cookieHeader = request.headers.get("Cookie");
    const token = await authCookie.parse(cookieHeader || "");

    if (!token) {
      console.log("No auth token found, redirecting to login");
      return redirect("/auth/login");
    }

    const isValid = await jwt.verify(
      token,
      context.cloudflare.env.AUTH_SESSION_SECRET,
    );

    if (!isValid) {
      console.log("Invalid auth token, redirecting to login");
      return redirect("/auth/login");
    }

    const decoded = jwt.decode(token);
    const payload = decoded.payload as UserPayload;

    if (!payload?.email || !payload?.role) {
      console.log("Invalid token payload, redirecting to login");
      return redirect("/auth/login");
    }

    const pathname = new URL(request.url).pathname;
    const isOnboardingRoute = pathname === "/onboarding";

    const schoolId = await context.services.schoolAccess.currentSchoolId();
    const mayManageSchool =
      schoolId == null
        ? true
        : await context.services.schoolAccess.can('school.school.update');

    if (!mayManageSchool && isOnboardingRoute) {
      return redirect("/");
    }

    if (mayManageSchool) {
      const onboardingStatus = await getOwnerOnboardingStatus(
        context.services,
      );
      const finishedOnboarding = hasFinishedOnboarding(onboardingStatus);

      if (!finishedOnboarding && !isOnboardingRoute) {
        return redirect("/onboarding");
      }

      if (finishedOnboarding && isOnboardingRoute) {
        return redirect("/");
      }
    }

    return { user: payload };
  } catch (error) {
    console.error("Auth error:", error);
    return redirect("/auth/login");
  }
}

export default function ProtectedLayout() {
  const { user } = useLoaderData<LoaderData>();

  return (
    <main>
      <Outlet context={{ user }} />
    </main>
  );
}
