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
  const cookieHeader = request.headers.get('Cookie');
  const token = await authCookie.parse(cookieHeader || '');
  if (typeof token !== 'string' || token.length === 0) return null;
  if (!token || typeof token !== 'string') return null;

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
