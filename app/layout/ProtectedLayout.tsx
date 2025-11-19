import { redirect } from 'react-router';
import { authCookie } from 'workers/utils/cookies.server';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { useLoaderData, Outlet } from 'react-router';

interface UserPayload {
  id: number;
  email: string;
  role: string;
}

interface LoaderData {
  user: UserPayload;
}

/**
 * Protected Layout Loader
 * - Checks if user has valid authentication token
 * - Verifies JWT token validity
 * - Redirects to login if authentication fails
 * - Passes user data to child routes
 */
export async function loader({ request, context }: any) {
  try {
    const cookieHeader = request.headers.get('Cookie');
    const token = await authCookie.parse(cookieHeader || '');

    // No token found - redirect to login
    if (!token) {
      console.log('No auth token found, redirecting to login');
      return redirect('/auth/login');
    }

    // Verify token signature and expiration
    const isValid = await jwt.verify(
      token,
      context.cloudflare.env.AUTH_SESSION_SECRET
    );

    if (!isValid) {
      console.log('Invalid auth token, redirecting to login');
      return redirect('/auth/login');
    }

    // Decode and extract user payload
    const decoded = jwt.decode(token);
    const payload = decoded.payload as UserPayload;

    // Validate payload has required fields
    if (!payload?.email || !payload?.role) {
      console.log('Invalid token payload, redirecting to login');
      return redirect('/auth/login');
    }

    return { user: payload };
  } catch (error) {
    // Any error during authentication - redirect to login
    console.error('Auth error:', error);
    return redirect('/auth/login');
  }
}

/**
 * Protected Layout Component
 * - Wraps all protected routes
 * - Provides user context to child routes
 * - Only renders if authentication is successful
 */
export default function ProtectedLayout() {
  const { user } = useLoaderData<LoaderData>();

  return (
    <main>
      <Outlet context={{ user }} />
    </main>
  );
}
