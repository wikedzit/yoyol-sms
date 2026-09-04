import {
  Building2,
  Mail,
  MapPin,
  Phone,
  Users,
  GraduationCap,
  UserRound,
  Hash,
  Palette,
  Pencil,
  Plus,
} from "lucide-react";
import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { PageHeader } from "~/components/ui/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type TeacherService from "workers/services/teachers";
import type StudentService from "workers/services/student";
import type SchoolService from "workers/services/school";
import { Button } from "~/components/ui/button";

export async function loader({ context }: LoaderFunctionArgs) {
  const services = context.services as {
    school: SchoolService;
    teacher: TeacherService;
    student: StudentService;
  };
  const schools = await services.school.getAll();
  const school = schools[0] ?? null;
  const [totalTeachers, totalStudents] = await Promise.all([
    services.teacher.countAll(),
    services.student.countAll(),
  ]);

  return {
    school,
    totalTeachers,
    totalStudents,
    totalRegistered: totalTeachers + totalStudents,
  };
}
export default function SchoolProfilePage() {
  const { school, totalTeachers, totalStudents, totalRegistered } =
    useLoaderData<typeof loader>();

  if (!school) {
    return (
      <p>School Profile to be added during onboarding</p>
      // <div className="min-h-screen space-y-6 pb-8">
      //   <PageHeader title="School Profile" />
      //   <Card>
      //     <CardContent className="flex min-h-[320px] flex-col items-center justify-center text-center">
      //       <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
      //         <Building2 className="h-10 w-10 text-muted-foreground" />
      //       </div>
      //       <h2 className="text-xl font-semibold">School Profile Not Found</h2>
      //       <p className="mt-2 max-w-lg text-sm text-muted-foreground">
      //         WE DON'T HAVE A REGISTERED SCHOOL YET
      //       </p>
      //     </CardContent>
      //   </Card>
      // </div>
    );
  }

  const schoolName = school.name;
  const schoolMotto = school.motto || "No motto provided";
  const schoolAddress = school.address || "Not provided";
  const schoolPhone = school.phone || "Not provided";
  const schoolEmail = school.email || "Not provided";
  const registrationNumber = school.registrationNumber || "Not provided";
  const logoUrl = school.logoUrl || "/assets/auth-page/yoyol-logo.png";
  const primaryColor = school.primaryColor || "#2563eb";
  const secondaryColor = school.secondaryColor || "#0f172a";

  return (
    <div className="min-h-screen space-y-6 pb-8">
      <PageHeader
        title="About Our School"
        actions={
          <>
            <Link to={`/schools/${school.id}`}>
              <Button className="flex items-center gap-2 bg-primary-gradient text-white transition-colors hover:bg-purple hover:text-white-600 hover:scale-110 cursor-pointer transition-all duration-300">
                <Pencil className="h-4 w-4" />
                Edit School
              </Button>
            </Link>
            <Button
              asChild
              className="flex items-center gap-2 bg-primary-gradient text-white hover:scale-110 hover:text-white-600 cursor-pointer transition-all duration-300"
            >
              <Link to="/schools/new">
                <Plus size={18} />
                <span className="font-medium">Add Campus</span>
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${primaryColor}20`,
                }}
              >
                <Building2
                  className="h-6 w-6"
                  style={{
                    color: primaryColor,
                  }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  School-NAME
                </p>
                <p className="truncate text-2xl font-bold">{schoolName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${primaryColor}15`,
                }}
              >
                <GraduationCap
                  className="h-6 w-6"
                  style={{
                    color: primaryColor,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Teachers
                </p>
                <p className="text-2xl font-bold">{totalTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${secondaryColor}15`,
                }}
              >
                <UserRound
                  className="h-6 w-6"
                  style={{
                    color: secondaryColor,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Students
                </p>
                <p className="text-2xl font-bold">{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${primaryColor}15`,
                }}
              >
                <Users
                  className="h-6 w-6"
                  style={{
                    color: primaryColor,
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Registered
                </p>
                <p className="text-2xl font-bold">{totalRegistered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* SCHOOL IDENTITY */}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2
                className="h-5 w-5"
                style={{
                  color: primaryColor,
                }}
              />
              {schoolName}
            </CardTitle>
            <CardDescription>{schoolMotto}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* SCHOOL NAME */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  School Name
                </p>
                <p className="text-2xl font-semibold">{school.name}</p>
              </div>

              {/* MOTTO */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Motto
                </p>
                <p className="text-2xl">{school.motto || "Not provided"}</p>
              </div>

              {/* REGISTRATION NUMBER */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Registration Number
                </p>
                <p className="text-2xl">{registrationNumber}</p>
              </div>

              {/* SCHOOL ID */}
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  School ID
                </p>
                <p className="text-2xl">{school.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Official School Logo</CardTitle>
            <CardDescription>OUR OFFICIAL LOGO</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="flex h-[180px] items-center justify-center rounded-lg border p-6"
              style={{
                borderColor: `${primaryColor}40`,
              }}
            >
              <img
                src={logoUrl}
                alt={`${schoolName} logo`}
                className="max-h-[140px] max-w-full object-contain"
                onError={(event) => {
                  event.currentTarget.src = "/assets/auth-page/yoyol-logo.png";
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>HOW TO REACH US</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <MapPin
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{
                    color: primaryColor,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    {schoolAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{
                    color: primaryColor,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{schoolPhone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{
                    color: primaryColor,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Email</p>
                  <p className="break-all text-sm text-muted-foreground">
                    {schoolEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Hash
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{
                    color: primaryColor,
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Registration Number</p>
                  <p className="text-sm text-muted-foreground">
                    {registrationNumber}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme Colours{" "}
            </CardTitle>
            <CardDescription>
              Colours configured for this school.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Primary</p>
                <p className="font-mono text-xs uppercase text-muted-foreground">
                  {primaryColor}
                </p>
              </div>
              <div
                className="h-10 w-10 rounded-md border shadow-sm"
                style={{
                  backgroundColor: primaryColor,
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium"> Secondary</p>
                <p className="font-mono text-xs uppercase text-muted-foreground">
                  {secondaryColor}
                </p>
              </div>

              <div
                className="h-10 w-10 rounded-md border shadow-sm"
                style={{
                  backgroundColor: secondaryColor,
                }}
              />
            </div>

            <div className="overflow-hidden rounded-lg border">
              <div
                className="px-4 py-3 text-sm font-semibold text-white"
                style={{
                  backgroundColor: primaryColor,
                }}
              >
                Primary Colour
              </div>

              <div
                className="px-4 py-3 text-sm font-semibold text-white"
                style={{
                  backgroundColor: secondaryColor,
                }}
              >
                Secondary Colour
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registration Summary
          </CardTitle>
          <CardDescription>
            Live registration totals retrieved from the database.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* TEACHERS */}
            <div className="rounded-lg border p-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${primaryColor}15`,
                  }}
                >
                  <GraduationCap
                    className="h-5 w-5"
                    style={{
                      color: primaryColor,
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Registered Teachers
                  </p>
                  <p className="text-3xl font-bold">{totalTeachers}</p>
                </div>
              </div>
            </div>

            {/* STUDENTS */}
            <div className="rounded-lg border p-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${secondaryColor}15`,
                  }}
                >
                  <UserRound
                    className="h-5 w-5"
                    style={{
                      color: secondaryColor,
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Registered Students
                  </p>
                  <p className="text-3xl font-bold">{totalStudents}</p>
                </div>
              </div>
            </div>

            {/* TOTAL */}
            <div
              className="rounded-lg border p-5"
              style={{
                borderColor: `${primaryColor}40`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${primaryColor}15`,
                  }}
                >
                  <Users
                    className="h-5 w-5"
                    style={{
                      color: primaryColor,
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Registered
                  </p>
                  <p className="text-3xl font-bold">{totalRegistered}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
