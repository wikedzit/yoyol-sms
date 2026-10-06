import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { SchoolProfileView } from "~/components/school/SchoolProfileView";
import { loadSchoolProfile } from "~/lib/school-profile.server";
import { requireAnySchoolPermission } from "~/lib/require-school-permission";

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireAnySchoolPermission(request, context.services, [
    "school.profile.read",
    "school.archive",
  ]);
  return loadSchoolProfile(context.services);
}

export default function SchoolProfilePage() {
  const schoolProfile = useLoaderData<typeof loader>();

  return <SchoolProfileView {...schoolProfile} />;
}
