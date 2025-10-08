import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "New React Router App" },
		{ name: "description", content: "Welcome to React Router!" },
	];
}

export async function loader({ context }: Route.LoaderArgs) {
	// Example of using the ServiceContainer
	const services = context.services;

	const classes = await services.class.getAll({
		offset: 0,
		sortBy: "name",
		sortOrder: "asc",
		search: "",
		limit: 10,
	});

	console.log("classes", classes);

	return {
		message: context.cloudflare.env.VALUE_FROM_CLOUDFLARE,
		// You can now access services like: services.class.getAll({})
	};
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return <Welcome message={loaderData.message} />;
}
