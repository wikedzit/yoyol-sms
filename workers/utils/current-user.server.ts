import jwt from '@tsndr/cloudflare-worker-jwt';
import { authCookie } from 'workers/utils/cookies.server';

type SessionPayload = {
  id?: number;
  email?: string;
  role?: string;
};

export async function getCurrentUserId(
  request: Request,
  jwtSecret: string,
): Promise<number | null> {
<<<<<<< HEAD
  try {
    const cookieHeader = request.headers.get('Cookie');
    const token = await authCookie.parse(cookieHeader || '');

    if (!token || typeof token !== 'string') {
      return null;
    }

    const isValid = await jwt.verify(token, jwtSecret);
    if (!isValid) return null;

    const decoded = jwt.decode(token);
    const payload = decoded.payload as SessionPayload;

    return typeof payload?.id === 'number' ? payload.id : null;
  } catch (error) {
    // Any unexpected failure while reading/verifying the session
    // (corrupted cookie, malformed token, decode error, etc.) should
    // simply mean "not logged in" rather than crashing the whole request.
    console.error('getCurrentUserId failed:', error);
    return null;
  }
}
=======
  const cookieHeader = request.headers.get('Cookie');
  const token = await authCookie.parse(cookieHeader || '');
  if (typeof token !== 'string' || token.length === 0) return null;

  try {
    const isValid = await jwt.verify(token, jwtSecret);
    if (!isValid) return null;

    const decoded = jwt.decode(token);
    const payload = decoded.payload as SessionPayload;

    return typeof payload?.id === 'number' ? payload.id : null;
  } catch {
    return null;
  }
}
>>>>>>> 4bc06317f28f92d2256501ed8db2c98b9667d215
