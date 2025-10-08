import { createRequestHandler } from "react-router";
import ServiceContainer from "./services/index";

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
		// Initialize services using the factory
		const services = new ServiceContainer(env.DB);

		return requestHandler(request, {
			cloudflare: { env, ctx },
			services,
		});
	},
} satisfies ExportedHandler<Env>;
