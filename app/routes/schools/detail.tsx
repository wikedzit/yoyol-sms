import { useEffect, useState } from 'react';
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  Link,
  useFetcher,
  useLoaderData,
} from 'react-router';
import {
  Award,
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Quote,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '~/components/ui/PageHeader';
import { PageBreadcrumb } from '~/components/ui/PageFrame';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import type SchoolService from 'workers/services/school';
import type StudentService from 'workers/services/student';
import { requireSchoolPermission } from '~/lib/require-school-permission';

export async function loader({
  request,
  context,params,
}: LoaderFunctionArgs) {
  const services = context.services as {
    school: SchoolService;
    student: StudentService;
  };
  const schoolId = Number(params.schoolId);
  const profile = await services.school.getById(schoolId);
  if (!profile) {
    throw new Response('School not found', {
      status: 404,});
  }
  await requireSchoolPermission(request, context.services, 'school.profile.read', schoolId);
  const totalStudents =
    await services.student.countBySchoolId(schoolId);

  return {
    profile,
    totalStudents,
  };
}

export async function action({
  request,
  context,
  params,
}: ActionFunctionArgs) {
  const services = context.services as {
    school: SchoolService;
    student: StudentService;
  };
  const schoolId = Number(params.schoolId);
  await requireSchoolPermission(request, context.services, 'school.profile.update', schoolId);
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;
  if (method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: 'Invalid request method',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  const data = {
    name: String(form.get('name') || ''),
    address: String(form.get('address') || ''),
    phone: String(form.get('phone') || ''),
    email: String(form.get('email') || ''),
    motto: String(form.get('motto') || ''),
    registrationNumber: String(
      form.get('registrationNumber') || ''
    ),
    logoUrl: String(form.get('logoUrl') || ''),
    primaryColor: String(
      form.get('primaryColor') || '#2563eb'
    ),
    secondaryColor: String(
      form.get('secondaryColor') || '#0f172a'
    ),
  };
  const updated = await services.school.update(
    schoolId, data);
  if (!updated) {
    return new Response(
      JSON.stringify({
        error: 'Failed to save school profile',
      }),{
        status: 400, headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return {
    success: true,
    profile: updated,
  };
}

export default function SchoolProfilePage() {
  const { profile, totalStudents } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [isEditing, setIsEditing] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(
    profile.primaryColor ?? '#2563eb');
  const [secondaryColor, setSecondaryColor] = useState(
    profile.secondaryColor ?? '#0f172a');

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) {
      return;
    }
    if (
      'success' in fetcher.data &&
      fetcher.data.success &&
      'profile' in fetcher.data &&
      fetcher.data.profile
    ) {
      const savedProfile = fetcher.data.profile;
      toast.success(
        'Your school profile has been updated successfully!'
      );
      setIsEditing(false);
      setPrimaryColor(savedProfile.primaryColor ?? '#2563eb');
      setSecondaryColor(savedProfile.secondaryColor ?? '#0f172a');
    }

    if ('error' in fetcher.data && typeof fetcher.data.error === 'string') {
      toast.error(fetcher.data.error);
    }
  }, [fetcher.state, fetcher.data]);

  const isSaving = fetcher.state === 'submitting';
  const displayProfile =
    fetcher.data && 'profile' in fetcher.data && fetcher.data.profile
      ? fetcher.data.profile
      : profile;
  const currentPrimaryColor = displayProfile.primaryColor ?? '#2563eb';
  const currentSecondaryColor = displayProfile.secondaryColor ?? '#0f172a';

  return (
    <div className="space-y-6">
      <PageBreadcrumb />

      {/* Back to Schools */}
      <Link
        to="/schools/profile"
        className="inline-flex items-center rounded-md bg-primary-gradient px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple hover:text-white"
      >
        Back to Schools
      </Link>

      {/* Header */}
      <PageHeader
        title={displayProfile.name}
        description="Manage this school's identity and contact details"
        actions={
          !isEditing ? (
            <div className="flex flex-col items-end gap-2">
              <p className="text-xl font-semibold text-foreground">
                ARE YOU SURE YOU WANT TO EDIT
              </p>

              <Button
                onClick={() => {
                  setPrimaryColor(
                    currentPrimaryColor
                  );
                  setSecondaryColor(
                    currentSecondaryColor
                  );
                  setIsEditing(true);
                }}
                className="flex items-center gap-2 hover:scale-110 bg-primary-gradient text-white transition-colors hover:bg-purple hover:text-white-600 cursor-pointer"
              >
                <Pencil size={16} />
                Edit Profile
              </Button>
            </div>
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School Details
          </CardTitle>
          <CardDescription>
            This information appears on reports,
            notices, and other official documents.
          </CardDescription>
        </CardHeader>

        <CardContent>

          {isEditing ? (

            /* =========================
               EDIT MODE
            ========================== */

            <fetcher.Form
              method="post"
              className="space-y-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">

                {/* School Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    School Name *
                  </Label>

                  <Input
                    id="name"
                    name="name"
                    defaultValue={displayProfile.name}
                    required
                  />
                </div>

                {/* Registration Number */}
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">
                    Registration Number
                  </Label>
                  <Input
                    id="registrationNumber"
                    name="registrationNumber"
                    defaultValue={
                      displayProfile.registrationNumber ??
                      ''
                    }
                  />
                </div>

                {/* Address */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">
                    Address
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={
                      displayProfile.address ?? ''
                    }
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={
                      displayProfile.phone ?? ''
                    }
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={
                      displayProfile.email ?? ''
                    }
                  />
                </div>

                {/* Motto */}
                <div className="space-y-2">
                  <Label htmlFor="motto">
                    Motto
                  </Label>
                  <Input
                    id="motto"
                    name="motto"
                    defaultValue={
                      displayProfile.motto ?? ''
                    }
                  />
                </div>

                {/* Logo URL */}
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">
                    Logo URL
                  </Label>
                  <Input
                    id="logoUrl"
                    name="logoUrl"
                    defaultValue={
                      displayProfile.logoUrl ?? ''
                    }
                  />
                </div>
              </div>

              {/* =========================
                  SCHOOL COLORS
              ========================== */}

              <div className="grid gap-6 sm:grid-cols-2">

                {/* Primary Color */}
                <div className="space-y-3">
                  <Label htmlFor="primaryColor">
                    Primary Color
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="primaryColor"
                      name="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(event) =>
                        setPrimaryColor(
                          event.target.value
                        )
                      }
                      className="h-12 w-20 cursor-pointer p-1"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(event) =>
                        setPrimaryColor(
                          event.target.value
                        )
                      }
                      className="font-mono uppercase"
                      maxLength={7}
                    />
                  </div>

                  {/* Preview */}
                  <div
                    className="h-12 w-full rounded-md border shadow-sm"
                    style={{
                      backgroundColor: primaryColor,
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Main colour used throughout the
                    school interface.
                  </p>
                </div>

                {/* Secondary Color */}
                <div className="space-y-3">
                  <Label htmlFor="secondaryColor">
                    Secondary Color
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="secondaryColor"
                      name="secondaryColor"
                      type="color"
                      value={secondaryColor}
                      onChange={(event) =>
                        setSecondaryColor(
                          event.target.value
                        )
                      }
                      className="h-12 w-20 cursor-pointer p-1"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(event) =>
                        setSecondaryColor(
                          event.target.value
                        )
                      }
                      className="font-mono uppercase"
                      maxLength={7}
                    />
                  </div>

                  {/* Preview */}
                  <div
                    className="h-12 w-full rounded-md border shadow-sm"
                    style={{
                      backgroundColor:
                        secondaryColor,
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Secondary colour used for accents
                    and supporting elements.
                  </p>
                </div>
              </div>

              {/* =========================
                  COLOR COMBINATION PREVIEW
              ========================== */}

              <div className="space-y-3">
                <Label>School Colour Preview</Label>
                <div className="overflow-hidden rounded-lg border shadow-sm">
                  <div
                    className="flex items-center justify-between px-5 py-4 text-white"
                    style={{
                      backgroundColor: primaryColor,
                    }}
                  >
                    <span className="font-semibold">
                      {displayProfile.name}
                    </span>
                    <span className="text-sm opacity-90">
                      Primary
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between px-5 py-3 text-white"
                    style={{
                      backgroundColor:
                        secondaryColor,
                    }}
                  >
                    <span className="text-sm">
                      School Interface
                    </span>
                    <span className="text-sm opacity-90">
                      Secondary
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center hover:scale-110 gap-2 bg-primary-gradient text-white transition transition-colors hover:bg-purple hover:text-white-600 cursor-pointer"
                >
                  <Save size={16} />
                  {isSaving
                    ? 'Saving...'
                    : 'Save Profile'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                   className="hover:scale-110 hover:text-white-600 transition cursor-pointer"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </fetcher.Form>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">

              {/* School Name */}
              <div>
                <p className="text-sm text-muted-foreground">
                  School Name
                </p>
                <p className="text-lg font-semibold">
                  {displayProfile.name}
                </p>
              </div>

              {/* Registration Number */}
              {displayProfile.registrationNumber && (
                <div className="flex items-start gap-2">
                  <Award
                    size={16}
                    className="mt-1 text-muted-foreground"
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Registration Number
                    </p>
                    <p className="font-medium">
                      {
                        displayProfile.registrationNumber
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Address */}
              {displayProfile.address && (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <MapPin
                    size={16}
                    className="mt-1 text-muted-foreground"
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Address
                    </p>
                    <p className="font-medium">
                      {displayProfile.address}
                    </p>
                  </div>
                </div>
              )}

              {/* Phone */}
              {displayProfile.phone && (
                <div className="flex items-start gap-2">
                  <Phone
                    size={16}
                    className="mt-1 text-muted-foreground"
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Phone
                    </p>
                    <p className="font-medium">
                      {displayProfile.phone}
                    </p>
                  </div>
                </div>
              )}

              {/* Email */}
              {displayProfile.email && (
                <div className="flex items-start gap-2">
                  <Mail
                    size={16}
                    className="mt-1 text-muted-foreground"
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Email
                    </p>
                    <p className="font-medium">
                      {displayProfile.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Motto */}
              {displayProfile.motto && (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Quote
                    size={16}
                    className="mt-1 text-muted-foreground"
                  />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Motto
                    </p>

                    <p className="font-medium italic">
                      "{displayProfile.motto}"
                    </p>
                  </div>
                </div>
              )}

              {/* =========================
                  PRIMARY COLOR
              ========================== */}

              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 shrink-0 rounded-md border shadow-sm"
                  style={{
                    backgroundColor:
                      currentPrimaryColor,
                  }}
                />

                <div>
                  <p className="text-sm text-muted-foreground">
                    Primary Color
                  </p>

                  <p className="font-mono font-medium uppercase">
                    {currentPrimaryColor}
                  </p>
                </div>
              </div>

              {/* =========================
                  SECONDARY COLOR
              ========================== */}

              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 shrink-0 rounded-md border shadow-sm"
                  style={{
                    backgroundColor:
                      currentSecondaryColor,
                  }}
                />

                <div>
                  <p className="text-sm text-muted-foreground">
                    Secondary Color
                  </p>
                  <p className="font-mono font-medium uppercase">
                    {currentSecondaryColor}
                  </p>
                </div>
              </div>


              <div className="sm:col-span-2">
                <p className="mb-3 text-sm text-muted-foreground">
                  School Colour Preview
                </p>
                <div className="overflow-hidden rounded-lg border shadow-sm">
                  <div
                    className="flex items-center justify-between px-5 py-4 text-white"
                    style={{
                      backgroundColor:
                        currentPrimaryColor,
                    }}
                  >
                    <span className="font-semibold">
                      {displayProfile.name}
                    </span>

                    <span className="text-sm opacity-90">
                      Primary
                    </span>
                  </div>

                  <div
                    className="flex items-center justify-between px-5 py-3 text-white"
                    style={{
                      backgroundColor:
                        currentSecondaryColor,
                    }}
                  >
                    <span className="text-sm">
                      School Interface
                    </span>
                    <span className="text-sm opacity-90">
                      Secondary
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Themes</CardTitle>
          <CardDescription>
            Install theme packages and choose the active one on the Themes page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link className="text-sm underline" to={`/themes?schoolId=${profile.id}`}>
            Open themes
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
