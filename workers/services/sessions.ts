import { and, eq, isNull } from 'drizzle-orm';
import jwt from '@tsndr/cloudflare-worker-jwt';
import type { AppDatabase } from '../database/app-database';
import { auditEvents } from '../database/audit-events';
import { sessions } from '../database/sessions';
import { users, type SelectUser } from '../database/users';
import {
  accessCookie,
  refreshCookie,
  serializeSessionCookies,
} from '../utils/cookies.server';

const ACCESS_SECONDS = 60 * 10;
const REFRESH_MS = 1000 * 60 * 60 * 24 * 14;

export type StartedSession = {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  sessionId: string;
};

export type OpenedSession = {
  userId: number | null;
  request: Request;
  cookies: string[];
};

export default class SessionService {
  constructor(
    private db: AppDatabase,
    private jwtSecret: string,
  ) {}

  async start(user: SelectUser, request: Request): Promise<StartedSession> {
    const sessionId = crypto.randomUUID();
    const refreshToken = randomToken();
    const csrfToken = randomToken();
    const now = Date.now();

    await this.db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      refreshHash: await sha256(refreshToken),
      expiresAt: now + REFRESH_MS,
      ip: clientIp(request),
      userAgent: request.headers.get('user-agent'),
      createdAt: now,
    });

    const accessToken = await this.signAccess(user, sessionId);
    return { accessToken, refreshToken, csrfToken, sessionId };
  }

  async open(request: Request): Promise<OpenedSession> {
    const cookieHeader = request.headers.get('Cookie');
    const accessToken = await accessCookie.parse(cookieHeader || '');
    if (typeof accessToken === 'string') {
      const current = await this.userIdFromAccess(accessToken);
      if (current) {
        return { userId: current, request, cookies: [] };
      }
    }

    const refreshToken = await refreshCookie.parse(cookieHeader || '');
    if (typeof refreshToken !== 'string' || !refreshToken) {
      return { userId: null, request, cookies: [] };
    }

    const rotated = await this.rotate(refreshToken);
    if (!rotated) {
      return { userId: null, request: stripSessionCookies(request), cookies: await clearSessionCookies() };
    }

    const cookies = await serializeSessionCookies(rotated);
    return {
      userId: rotated.userId,
      request: withCookie(request, await cookieHeaderWith(cookieHeader, cookies)),
      cookies,
    };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: Date.now() })
      .where(eq(sessions.id, sessionId));
  }

  async revokeAll(userId: number): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: Date.now() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  async recordAudit(input: {
    action: string;
    userId?: number | null;
    schoolId?: number | null;
    detail?: string | null;
    ip?: string | null;
  }): Promise<void> {
    await this.db.insert(auditEvents).values({
      action: input.action,
      userId: input.userId ?? null,
      schoolId: input.schoolId ?? null,
      detail: input.detail ?? null,
      ip: input.ip ?? null,
      createdAt: Date.now(),
    });
  }

  private async rotate(refreshToken: string): Promise<(StartedSession & { userId: number }) | null> {
    const session = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshHash, await sha256(refreshToken)))
      .get();

    if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
      return null;
    }

    const user = await this.userById(session.userId);
    if (!user) return null;

    const nextRefresh = randomToken();
    await this.db
      .update(sessions)
      .set({
        refreshHash: await sha256(nextRefresh),
        expiresAt: Date.now() + REFRESH_MS,
      })
      .where(eq(sessions.id, session.id));

    const accessToken = await this.signAccess(user, session.id);
    return {
      userId: user.id,
      sessionId: session.id,
      accessToken,
      refreshToken: nextRefresh,
      csrfToken: randomToken(),
    };
  }

  private async userIdFromAccess(token: string): Promise<number | null> {
    const valid = await jwt.verify(token, this.jwtSecret);
    if (!valid) return null;
    const payload = jwt.decode(token).payload as { id?: number; sid?: string };
    if (typeof payload.id !== 'number' || typeof payload.sid !== 'string') return null;

    const session = await this.db
      .select({ revokedAt: sessions.revokedAt, expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(eq(sessions.id, payload.sid))
      .get();

    if (!session || session.revokedAt || session.expiresAt <= Date.now()) return null;
    return payload.id;
  }

  private async userById(userId: number): Promise<SelectUser | null> {
    const user = await this.db.select().from(users).where(eq(users.id, userId)).get();
    return user ?? null;
  }

  private async signAccess(user: SelectUser, sessionId: string): Promise<string> {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role ?? 'admin',
        sid: sessionId,
        exp: Math.floor(Date.now() / 1000) + ACCESS_SECONDS,
      },
      this.jwtSecret,
    );
  }
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'local'
  );
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function clearSessionCookies(): Promise<string[]> {
  return [
    await accessCookie.serialize('', { maxAge: 0 }),
    await refreshCookie.serialize('', { maxAge: 0 }),
  ];
}

function stripSessionCookies(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.delete('Cookie');
  return new Request(request, { headers });
}

async function cookieHeaderWith(existing: string | null, setCookies: string[]): Promise<string> {
  const pairs = new Map<string, string>();
  for (const part of (existing || '').split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name) pairs.set(name, rest.join('='));
  }
  for (const setCookie of setCookies) {
    const [pair] = setCookie.split(';');
    const [name, ...rest] = pair.split('=');
    pairs.set(name, rest.join('='));
  }
  return [...pairs.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

function withCookie(request: Request, cookieHeader: string): Request {
  const headers = new Headers(request.headers);
  headers.set('Cookie', cookieHeader);
  return new Request(request, { headers });
}
