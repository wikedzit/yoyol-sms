import { createRequestHandler } from "react-router";
import ServiceContainer from "./services/index";
import { getCurrentUserId } from "./utils/current-user.server";
import { readDatabaseDriver } from "./database/adapter";

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
		const driver = readDatabaseDriver((env as { DB_DRIVER?: string }).DB_DRIVER);
		if (driver === 'postgres') {
			throw new Error('DB_DRIVER=postgres is for the Node host. This Worker uses D1.');
		}
		const ownerUserId = await getCurrentUserId(request, env.AUTH_SESSION_SECRET);
		const services = new ServiceContainer(
			env.DB,
			env.AUTH_SESSION_SECRET,
			ownerUserId,
		);

		const response = await requestHandler(request, {
			cloudflare: { env, ctx },
			services,
		});
		return withSecurityHeaders(request, response);
	},
} satisfies ExportedHandler<Env>;

function withSecurityHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
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
