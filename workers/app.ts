import { and, eq } from "drizzle-orm";
import { createRequestHandler } from "react-router";
import { readRememberedSchoolId } from "../app/lib/selected-school";
import { readDatabaseDriver } from "./database/adapter";
import { createD1Adapter } from "./database/d1-adapter";
import { schoolMemberships } from "./database/school-memberships";
import type { AppDatabase } from "./database/app-database";
import ServiceContainer from "./services/index";
import SessionService from "./services/sessions";
import { csrfHeaderMatchesCookie, requestNeedsCsrf } from "./utils/csrf";

declare module "react-router" {
	export interface AppLoadContext {
		cloudflare: {
			env: Env;
			ctx: ExecutionContext;
		};
		services: ServiceContainer;
	}
}

const requestHandler = createRequestHandler(
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE
);

export default {
	async fetch(request, env, ctx) {
		const id = crypto.randomUUID();
		const response = await handleRequest(request, env, ctx, id);
		const headers = new Headers(response.headers);
		headers.set('x-request-id', id);
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	},
} satisfies ExportedHandler<Env>;

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext, requestId: string): Promise<Response> {
		const driver = readDatabaseDriver((env as { DB_DRIVER?: string }).DB_DRIVER);
		if (driver === 'postgres') {
			throw new Error('DB_DRIVER=postgres is for the Node host. This Worker uses D1.');
		}

		const db = createD1Adapter(env.DB).db;
		const sessions = new SessionService(db, env.AUTH_SESSION_SECRET);
		const opened = await sessions.open(request);
		const csrf = await ensureCsrf(request);

		if (requestNeedsCsrf(request.method) && !csrfHeaderMatchesCookie(request.headers.get('x-csrf-token'), csrf.token)) {
			const headers = new Headers({ 'Content-Type': 'text/plain' });
			if (csrf.setCookie) headers.append('Set-Cookie', csrf.setCookie);
			return withSecurityHeaders(request, new Response('CSRF check failed.', { status: 403, headers }));
		}

		const schoolId = await resolveActiveSchoolId(db, opened.userId, opened.request);
		const services = new ServiceContainer(
			env.DB,
			env.AUTH_SESSION_SECRET,
			opened.userId,
			schoolId,
			requestId,
		);

		const response = await requestHandler(opened.request, {
			cloudflare: { env, ctx },
			services,
		});
		const headers = copyHeaders(response.headers);
		for (const cookie of opened.cookies) headers.append('Set-Cookie', cookie);
		if (csrf.setCookie) headers.append('Set-Cookie', csrf.setCookie);
		return withSecurityHeaders(request, new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		}));
}

async function resolveActiveSchoolId(
  db: AppDatabase,
  userId: number | null,
  request: Request,
): Promise<number | null> {
  if (userId == null) {
    return null;
  }

  const memberships = await db
    .select({ schoolId: schoolMemberships.schoolId })
    .from(schoolMemberships)
    .where(
      and(
        eq(schoolMemberships.userId, userId),
        eq(schoolMemberships.status, 'active'),
      ),
    );
  const schoolIds = memberships.map((membership) => membership.schoolId);
  const requested = Number(new URL(request.url).searchParams.get('schoolId'));
  if (schoolIds.includes(requested)) {
    return requested;
  }

  const remembered = await readRememberedSchoolId(request);
  if (remembered != null && schoolIds.includes(remembered)) {
    return remembered;
  }

  return schoolIds[0] ?? null;
}

async function ensureCsrf(request: Request): Promise<{ token: string; setCookie: string | null }> {
  const existing = readCookie(request.headers.get('Cookie'), 'yoyol_csrf');
  if (existing && /^[0-9a-f]{64}$/.test(existing)) {
    return { token: existing, setCookie: null };
  }

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const maxAge = 60 * 60 * 24 * 14;
  return {
    token,
    setCookie: `yoyol_csrf=${token}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`,
  };
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function copyHeaders(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') headers.append(key, value);
  });
  for (const cookie of source.getSetCookie()) {
    headers.append('Set-Cookie', cookie);
  }
  return headers;
}

function withSecurityHeaders(request: Request, response: Response): Response {
  const headers = copyHeaders(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set(
    'Content-Security-Policy',
    "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  );
  if (new URL(request.url).protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=31536000');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
