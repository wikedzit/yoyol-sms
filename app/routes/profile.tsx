import { useState, useEffect } from 'react';
import { redirect } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { useFetcher, useLoaderData } from 'react-router';
import jwt from '@tsndr/cloudflare-worker-jwt';
import { toast } from 'sonner';
import { authCookie } from 'workers/utils/cookies.server';
import { PageHeader } from '~/components/ui/PageHeader';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';
import EditProfileModal from '~/components/modal/EditProfileModal';

type ProfileLoaderData = {
  account: {
    id: number;
    email: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    createdAt: number;
  } | null;
  role: string;
  roleData: Record<string, any> | null;
};

// --- Shared auth helper: same JWT-parse pattern used in the loader below
// and DashboardLyout.tsx / ProtectedLayout.tsx, since loaders can't read
// the Outlet context ProtectedLayout already builds. ---
async function getAuthPayload(request: Request, context: any) {
  const cookieHeader = request.headers.get('Cookie');
  const token = await authCookie.parse(cookieHeader || '');
  if (!token) return null;

  const isValid = await jwt.verify(token, context.cloudflare.env.AUTH_SESSION_SECRET);
  if (!isValid) return null;

  const decoded = jwt.decode(token);
  return decoded.payload as { id: number; email: string; role: string };
}

// --- Loader ---
export async function loader({ request, context }: LoaderFunctionArgs) {
  const payload = await getAuthPayload(request, context);
  if (!payload) return redirect('/auth/login');

  const services = context.services as any;

  const account = await services.users.findUserByEmail(payload.email);

  let roleData: Record<string, any> | null = null;
  if (payload.role === 'teacher') {
    roleData = await services.teacher.getTeacherByEmail(payload.email);
  } else if (payload.role === 'student') {
    roleData = await services.student.getByEmail(payload.email);
  }

  return {
    account: account
      ? {
          id: account.id,
          email: account.email,
          role: account.role,
          firstName: account.firstName,
          lastName: account.lastName,
          createdAt: account.createdAt,
        }
      : null,
    role: payload.role,
    roleData,
  };
}

// --- Action ---
export async function action({ request, context }: ActionFunctionArgs) {
  const payload = await getAuthPayload(request, context);
  if (!payload) return redirect('/auth/login');

  const services = context.services as any;
  const form = await request.formData();
  const actionType = form.get('action') as string | null;

  try {
    if (actionType === 'update_profile') {
      if (payload.role === 'teacher') {
        const roleData = await services.teacher.getTeacherByEmail(payload.email);
        if (!roleData) {
          return { error: 'No teacher record linked to your account.', action: 'update_profile' };
        }
        const updated = await services.teacher.updateTeacherById(roleData.id, {
          firstName: String(form.get('firstName') ?? ''),
          lastName: String(form.get('lastName') ?? ''),
          phone: String(form.get('phone') ?? ''),
          address: String(form.get('address') ?? ''),
          qualification: String(form.get('qualification') ?? ''),
        });
        if (!updated) {
          return { error: 'Failed to update profile.', action: 'update_profile' };
        }
        return { success: true, action: 'update_profile' };
      }

      if (payload.role === 'student') {
        const roleData = await services.student.getByEmail(payload.email);
        if (!roleData) {
          return { error: 'No student record linked to your account.', action: 'update_profile' };
        }
        const updated = await services.student.update(roleData.id, {
          firstName: String(form.get('firstName') ?? ''),
          lastName: String(form.get('lastName') ?? ''),
          phone: String(form.get('phone') ?? ''),
          address: String(form.get('address') ?? ''),
          guardianName: String(form.get('guardianName') ?? ''),
          guardianPhone: String(form.get('guardianPhone') ?? ''),
        });
        if (!updated) {
          return { error: 'Failed to update profile.', action: 'update_profile' };
        }
        return { success: true, action: 'update_profile' };
      }

      // Admin / Finance / Parent: name lives on `users` directly.
      const updated = await services.users.updateName(
        payload.id,
        String(form.get('firstName') ?? ''),
        String(form.get('lastName') ?? '')
      );
      if (!updated) {
        return { error: 'Failed to update profile.', action: 'update_profile' };
      }
      return { success: true, action: 'update_profile' };
    }

    if (actionType === 'change_password') {
      const currentPassword = String(form.get('currentPassword') ?? '');
      const newPassword = String(form.get('newPassword') ?? '');
      const confirmPassword = String(form.get('confirmPassword') ?? '');

      if (newPassword.length < 8) {
        return { error: 'New password must be at least 8 characters.', action: 'change_password' };
      }
      if (newPassword !== confirmPassword) {
        return { error: 'New password and confirmation do not match.', action: 'change_password' };
      }

      const result = await services.users.changePassword(
        payload.id,
        currentPassword,
        newPassword
      );
      if (result.error) {
        return { error: result.error, action: 'change_password' };
      }
      return { success: true, action: 'change_password' };
    }

    return { error: 'Unknown action' };
  } catch (err: any) {
    console.error('profile action error:', err);
    return { error: err?.message || 'Server error' };
  }
}

// --- Helpers ---
function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrator',
    teacher: 'Teacher',
    student: 'Student',
    parent: 'Parent / Guardian',
    finance: 'Finance',
  };
  return labels[role] || role;
}

function formatDate(timestamp?: number | null): string {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? '—'}</span>
    </div>
  );
}

// --- Page ---
export default function ProfilePage() {
  const { account, role, roleData } = useLoaderData<ProfileLoaderData>();
  const fetcher = useFetcher<any>();
  const passwordFetcher = useFetcher<any>();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const hasRoleData = (isTeacher || isStudent) && roleData;

  const fullName = hasRoleData
    ? `${roleData.firstName} ${roleData.lastName}`
    : account?.firstName || account?.lastName
      ? `${account?.firstName ?? ''} ${account?.lastName ?? ''}`.trim()
      : account?.email ?? 'Unknown user';

  const initial = fullName.charAt(0).toUpperCase();

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      toast.success('Profile updated.');
    }
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    if (passwordFetcher.state === 'idle' && passwordFetcher.data) {
      if (passwordFetcher.data.success) {
        toast.success('Password changed successfully.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
      if (passwordFetcher.data.error) {
        toast.error(passwordFetcher.data.error);
      }
    }
  }, [passwordFetcher.state, passwordFetcher.data]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set('_method', 'PUT');
    fd.set('action', 'change_password');
    fd.set('currentPassword', passwordForm.currentPassword);
    fd.set('newPassword', passwordForm.newPassword);
    fd.set('confirmPassword', passwordForm.confirmPassword);
    passwordFetcher.submit(fd, { method: 'post', action: '/profile' });
  };

  return (
    <div className="min-h-screen">
      <div className="space-y-6 max-w-2xl">
        <PageHeader title="My Profile" description="Your account information" />

        {/* Header card */}
        <Card className="p-6 border-none shadow-none">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 flex items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-semibold">
                  {initial}
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{fullName}</p>
                  <Badge variant="secondary">{roleLabel(role)}</Badge>
                  {hasRoleData && (roleData.gender || roleData.address) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {[roleData.gender, isStudent && roleData.dob && `Born ${roleData.dob}`, roleData.address]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={() => setIsEditOpen(true)}
               className =" hover:scale-110 hover:text-white-600 transition cursor-pointer">
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-4">
            <Card className="p-6 border-none shadow-none">
              <CardContent className="p-0">
                <InfoRow label="Email" value={account?.email} />
                <InfoRow label="Role" value={roleLabel(role)} />
                <InfoRow label="Member since" value={formatDate(account?.createdAt)} />
              </CardContent>
            </Card>

            {isTeacher && roleData && (
              <Card className="p-6 border-none shadow-none">
                <CardContent className="p-0">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Teacher Details
                  </h3>
                  <InfoRow label="Subject" value={roleData.subject} />
                  <InfoRow label="Phone" value={roleData.phone} />
                  <InfoRow label="Qualification" value={roleData.qualification} />
                  <InfoRow
                    label="Experience"
                    value={roleData.experience ? `${roleData.experience} years` : '—'}
                  />
                  <InfoRow label="Status" value={roleData.status} />
                </CardContent>
              </Card>
            )}
            {isTeacher && !roleData && (
              <Card className="p-6 border-none shadow-none bg-amber-50">
                <CardContent className="p-0">
                  <p className="text-sm text-amber-700">
                    We couldn&apos;t find a teacher record linked to your
                    account yet. Contact your school admin to have one
                    connected.
                  </p>
                </CardContent>
              </Card>
            )}

            {isStudent && roleData && (
              <Card className="p-6 border-none shadow-none">
                <CardContent className="p-0">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Student Details
                  </h3>
                  <InfoRow label="Phone" value={roleData.phone} />
                  <InfoRow label="Guardian" value={roleData.guardianName} />
                  <InfoRow label="Guardian phone" value={roleData.guardianPhone} />
                  <InfoRow label="Grade" value={roleData.grade} />
                  <InfoRow label="Enrollment date" value={roleData.enrollmentDate} />
                  <InfoRow label="Status" value={roleData.status} />
                </CardContent>
              </Card>
            )}
            {isStudent && !roleData && (
              <Card className="p-6 border-none shadow-none bg-amber-50">
                <CardContent className="p-0">
                  <p className="text-sm text-amber-700">
                    We couldn&apos;t find a student record linked to your
                    account yet. Contact your school admin to have one
                    connected.
                  </p>
                </CardContent>
              </Card>
            )}

            {role === 'parent' && (
              <Card className="p-6 border-none shadow-none bg-blue-50">
                <CardContent className="p-0">
                  <p className="text-sm text-blue-700">
                    No student records are linked to your account yet. This
                    feature is still being built out — check back soon.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <Card className="p-6 border-none shadow-none">
              <CardContent className="p-0">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Change Password
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a new password with at least 8 characters.
                </p>
                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      required
                      minLength={8}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      required
                      minLength={8}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="bg-primary-gradient text-white py-2 px-4 rounded-[8px] hover:scale-110 hover:text-white-600 transition cursor-pointer"
                  >
                    {passwordFetcher.state === 'submitting' ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {isEditOpen && (
        <EditProfileModal
          open={isEditOpen}
          setOpen={setIsEditOpen}
          fetcher={fetcher}
          role={role}
          account={account}
          roleData={roleData}
        />
      )}
    </div>
  );
}
