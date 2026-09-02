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
} from 'lucide-react';
import type { LoaderFunctionArgs } from 'react-router';
import { Link, useLoaderData } from 'react-router';
import { PageHeader } from '~/components/ui/PageHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';

import type TeacherService from 'workers/services/teachers';
import type StudentService from 'workers/services/student';
import type SchoolService from 'workers/services/school';
import { Button } from '~/components/ui/button';
export async function loader({
  context,
}: LoaderFunctionArgs) {
  const services = context.services as {
    school: SchoolService;
    teacher: TeacherService;
    student: StudentService;
  };
  const schools = await services.school.getAll();
  const school = schools[0] ?? null;
  const [totalTeachers, totalStudents] =
    await Promise.all([
      services.teacher.countAll(),
      services.student.countAll(),
    ]);

  return {
    school,
    totalTeachers,
    totalStudents,
    totalRegistered:
      totalTeachers + totalStudents,
  };
}

export default function SchoolProfilePage() {
  const {
    school,
    totalTeachers,
    totalStudents,
    totalRegistered,
  } = useLoaderData<typeof loader>();

  /*
   * NO SCHOOL PROFILE
   */

  if (!school) {
    return (
      <div className="min-h-screen space-y-6 pb-8">
        <PageHeader
          title="School Profile"
          description="View your school's identity, branding, contact details, and registration statistics"
        />

        <Card>
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>

            <h2 className="text-xl font-semibold">
              School Profile Not Found
            </h2>

            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              No school profile has been registered
              in the database yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /*
   * ==========================================================
   * SCHOOL DATABASE VALUES
   * ==========================================================
   */

  const schoolName = school.name;

  const schoolMotto =
    school.motto || 'No motto provided';

  const schoolAddress =
    school.address || 'Not provided';

  const schoolPhone =
    school.phone || 'Not provided';

  const schoolEmail =
    school.email || 'Not provided';

  const registrationNumber =
    school.registrationNumber || 'Not provided';

const logoUrl = "/assets/auth-page/yoyol-logo.png";
 
  const primaryColor =
    school.primaryColor || '#2563eb';

  const secondaryColor =
    school.secondaryColor || '#0f172a';

  return (
    <div className="min-h-screen space-y-6 pb-8">

      {/* ======================================================
          PAGE HEADER
          ====================================================== */}

      <PageHeader
  title="About Our School"
  actions={
    <Link to={`/schools/${school.id}`}>
  <Button
    className="flex items-center gap-2 bg-primary-gradient text-white hover:bg-purple hover:text-white transition-colors"
  >
    <Pencil className="h-4 w-4" />
    Edit School
  </Button>
</Link>

  }
/>

      {/* ======================================================
          SUMMARY CARDS
          ====================================================== */}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">

        {/* SCHOOL */}

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
                  School
                </p>

                <p className="truncate text-lg font-bold">
                  {schoolName}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TEACHERS */}

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <GraduationCap className="h-6 w-6 text-blue-500" />
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Teachers
                </p>

                <p className="text-2xl font-bold">
                  {totalTeachers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* STUDENTS */}

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                <UserRound className="h-6 w-6 text-green-500" />
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Students
                </p>

                <p className="text-2xl font-bold">
                  {totalStudents}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TOTAL REGISTERED */}

         <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                <Users className="h-6 w-6 text-purple-500" />
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Registered
                </p>

                <p className="text-2xl font-bold">
                  {totalRegistered}
                </p>
              </div>
            </div>
          </CardContent>
        </Card> 
      </div>

      {/* ======================================================
          SCHOOL IDENTITY + LOGO
          ====================================================== */}

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

            <CardDescription>
              {schoolMotto}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">

              {/* SCHOOL NAME */}

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  School Name
                </p>

                <p className="text-sm font-semibold">
                  {school.name}
                </p>
              </div>

              {/* MOTTO */}

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Motto
                </p>

                <p className="text-sm">
                  {school.motto || 'Not provided'}
                </p>
              </div>

              {/* REGISTRATION NUMBER */}

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Registration Number
                </p>

                <p className="text-sm">
                  {registrationNumber}
                </p>
              </div>

              {/* SCHOOL ID */}

              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  School ID
                </p>

                <p className="text-sm">
                  {school.id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================================================
            OFFICIAL LOGO
            ================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>
              Official School Logo
            </CardTitle>

            <CardDescription>
              Official logo configured for this school.
            </CardDescription>
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
              />
            </div>
          </CardContent>
        </Card>

        {/* ==================================================
            CONTACT INFORMATION
            ================================================== */}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Contact Information
            </CardTitle>

            <CardDescription>
              Contact details stored in the school database.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">

              {/* ADDRESS */}

              <div className="flex items-start gap-3">
                <MapPin
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{
                    color: primaryColor,
                  }}
                />

                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Address
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {schoolAddress}
                  </p>
                </div>
              </div>

              {/* PHONE */}

              <div className="flex items-start gap-3">
                <Phone
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{
                    color: primaryColor,
                  }}
                />

                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Phone
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {schoolPhone}
                  </p>
                </div>
              </div>

              {/* EMAIL */}

              <div className="flex items-start gap-3">
                <Mail
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{
                    color: primaryColor,
                  }}
                />

                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Email
                  </p>

                  <p className="break-all text-sm text-muted-foreground">
                    {schoolEmail}
                  </p>
                </div>
              </div>

              {/* REGISTRATION NUMBER */}

              <div className="flex items-start gap-3">
                <Hash
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{
                    color: primaryColor,
                  }}
                />

                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Registration Number
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {registrationNumber}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================================================
            THEME COLOURS
            ================================================== */}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />

              Theme Colours
            </CardTitle>

            <CardDescription>
              Colours configured for this school.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">

            {/* PRIMARY */}

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  Primary
                </p>

                <p className="text-xs text-muted-foreground">
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

            {/* SECONDARY */}

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  Secondary
                </p>

                <p className="text-xs text-muted-foreground">
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

          </CardContent>
        </Card>
      </div>

      {/* ======================================================
          REGISTRATION SUMMARY
          ====================================================== */}

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />

            Registration Summary
          </CardTitle>

          <CardDescription>
            Live registration totals retrieved from
            the database.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">

            {/* TEACHERS */}

            <div className="rounded-lg border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Registered Teachers
                  </p>

                  <p className="text-3xl font-bold">
                    {totalTeachers}
                  </p>
                </div>
              </div>
            </div>

            {/* STUDENTS */}

            <div className="rounded-lg border p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <UserRound className="h-5 w-5 text-green-500" />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Registered Students
                  </p>

                  <p className="text-3xl font-bold">
                    {totalStudents}
                  </p>
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

                  <p className="text-3xl font-bold">
                    {totalRegistered}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}

