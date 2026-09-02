import { useEffect, useState } from 'react';
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  Link,
  redirect,
  useFetcher,
  useLoaderData,
} from 'react-router';
import {
  Building2,
  Save,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Award,
  Quote,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '~/components/ui/PageHeader';
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
import { DeleteSchoolButton } from '~/components/DeleteSchoolButton';
import type SchoolService from 'workers/services/school';
import type StudentService from 'workers/services/student';

export async function loader({ context, params }: LoaderFunctionArgs) {
  const services = context.services as {
    school: SchoolService;
    student: StudentService;
  };
  const schoolId = Number(params.schoolId);

  const profile = await services.school.getById(schoolId);

  if (!profile) {
    throw new Response('School not found', { status: 404 });
  }

  const totalStudents = await services.student.countBySchoolId(schoolId);

  return { profile, totalStudents };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const services = context.services as {
    school: SchoolService;
    student: StudentService;
  };
  const schoolId = Number(params.schoolId);
  const form = await request.formData();
  const method = (form.get('_method') as string) || request.method;

  // --- DELETE SCHOOL ---
  if (method === 'DELETE') {
    const deleted = await services.school.delete(schoolId);
    if (!deleted) {
      return new Response(
        JSON.stringify({ error: 'Failed to delete school' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return redirect('/schools/profile');
  }

  // --- UPDATE SCHOOL ---
  const data = {
    name: String(form.get('name') || ''),
    address: String(form.get('address') || ''),
    phone: String(form.get('phone') || ''),
    email: String(form.get('email') || ''),
    motto: String(form.get('motto') || ''),
    registrationNumber: String(form.get('registrationNumber') || ''),
    logoUrl: String(form.get('logoUrl') || ''),
  };

  const updated = await services.school.update(schoolId, data);

  if (!updated) {
    return new Response(
      JSON.stringify({ error: 'Failed to save school profile' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return { success: true, profile: updated };
}

export default function SchoolProfilePage() {
  const { profile, totalStudents } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if ('error' in fetcher.data) {
        toast.error(fetcher.data.error);
      } else if (fetcher.data.success) {
        toast.success('School profile saved successfully!');
        setIsEditing(false);
      }
    }
  }, [fetcher.state, fetcher.data]);

  const isSaving = fetcher.state === 'submitting';
  const displayProfile =
    fetcher.data && 'profile' in fetcher.data ? fetcher.data.profile : profile;

  return (
    <div className="space-y-6">
      <Link
        to="/schools/profile"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Schools
      </Link>

      <PageHeader
        title={displayProfile.name}
        description="Manage this school's identity and contact details"
        actions={
          !isEditing ? (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="flex items-center gap-2  hover:scale-110 hover:text-white-600 transition cursor-pointer"
              >
                <Pencil size={16} />
                Edit Profile
              </Button>

              <DeleteSchoolButton
                id={displayProfile.id}
                name={displayProfile.name}
                fetcher={fetcher}
              />
            </div>
          ) : undefined
        }
      />

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card className="p-6 border-none shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Students
              </p>
              <p className="text-2xl font-bold text-foreground">
                {totalStudents}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School Details
          </CardTitle>
          <CardDescription>
            This information appears on reports, notices, and other official
            documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <fetcher.Form method="post" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">School Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={displayProfile.name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    name="registrationNumber"
                    defaultValue={displayProfile.registrationNumber ?? ''}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={displayProfile.address ?? ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={displayProfile.phone ?? ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={displayProfile.email ?? ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motto">Motto</Label>
                  <Input
                    id="motto"
                    name="motto"
                    defaultValue={displayProfile.motto ?? ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    name="logoUrl"
                    defaultValue={displayProfile.logoUrl ?? ''}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary-gradient text-white flex items-center gap-2  hover:scale-110 hover:text-white-600 transition cursor-pointer"
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Profile'}
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
              <div>
                <p className="text-sm text-muted-foreground">School Name</p>
                <p className="text-lg font-semibold">{displayProfile.name}</p>
              </div>

              {displayProfile.registrationNumber && (
                <div className="flex items-start gap-2">
                  <Award size={16} className="mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Registration Number</p>
                    <p className="font-medium">{displayProfile.registrationNumber}</p>
                  </div>
                </div>
              )}

              {displayProfile.address && (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <MapPin size={16} className="mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{displayProfile.address}</p>
                  </div>
                </div>
              )}

              {displayProfile.phone && (
                <div className="flex items-start gap-2">
                  <Phone size={16} className="mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{displayProfile.phone}</p>
                  </div>
                </div>
              )}

              {displayProfile.email && (
                <div className="flex items-start gap-2">
                  <Mail size={16} className="mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{displayProfile.email}</p>
                  </div>
                </div>
              )}

              {displayProfile.motto && (
                <div className="flex items-start gap-2 sm:col-span-2">
                  <Quote size={16} className="mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Motto</p>
                    <p className="font-medium italic">"{displayProfile.motto}"</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}