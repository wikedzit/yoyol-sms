import { redirect } from 'react-router';
import { authCookie } from 'workers/utils/cookies.server';

/**
 * Logout Loader (handles GET requests)
 * - Clears the authentication cookie
 * - Redirects to login page
 */
export async function loader() {
  return redirect('/auth/login', {
    headers: {
      'Set-Cookie': await authCookie.serialize('', { maxAge: 0 }),
    },
  });
}

/**
 * Logout Action (handles POST requests)
 * - Clears the authentication cookie
 * - Redirects to login page
 */
export async function action() {
  return redirect('/auth/login', {
    headers: {
      'Set-Cookie': await authCookie.serialize('', { maxAge: 0 }),
    },
  });
}
