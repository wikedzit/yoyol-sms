import { createRequestHandler } from "react-router";
import ServiceContainer from "./services/index";
import { getCurrentUserId } from "./utils/current-user.server";

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
		const ownerUserId = await getCurrentUserId(request, env.AUTH_SESSION_SECRET);
		const services = new ServiceContainer(
			env.DB,
			env.AUTH_SESSION_SECRET,
			ownerUserId,
		);

		return requestHandler(request, {
			cloudflare: { env, ctx },
			services,
		});
	},
} satisfies ExportedHandler<Env>;
