import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { SchoolProfileView } from "~/components/school/SchoolProfileView";
import { loadSchoolProfile } from "~/lib/school-profile.server";

export async function loader({ context }: LoaderFunctionArgs) {
  return loadSchoolProfile(context.services);
}

export default function SchoolProfilePage() {
  const schoolProfile = useLoaderData<typeof loader>();

  return <SchoolProfileView {...schoolProfile} />;
}
