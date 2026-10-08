import { useState, useEffect } from "react";
import { redirect } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, useSearchParams } from "react-router";
import jwt from "@tsndr/cloudflare-worker-jwt";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { authCookie } from "workers/utils/cookies.server";
import { PageHeader } from "~/components/ui/PageHeader";
import { PageBreadcrumb } from "~/components/ui/PageFrame";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import EditProfileModal from "~/components/modal/EditProfileModal";
import { SchoolProfileView } from "~/components/school/SchoolProfileView";
import { isAdminRole } from "~/lib/roles";
import {
  emptySchoolProfile,
  loadSchoolProfile,
  type SchoolProfileData,
} from "~/lib/school-profile.server";
import { useLanguage } from "~/lib/i18n";

type ProfileLoaderData = {
  account: {
    id: number;
    email: string;
    role: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    preferredLanguage: string | null;
    avatarUrl: string | null;
    createdAt: number;
  } | null;
  role: string;
  roleData: Record<string, any> | null;
  teacherSubjects: { id: number; subjectName: string }[];
  teacherClasses: { id: number; name: string }[];
  recentGrades: Array<{
    id: number;
    score: number;
    grade: string;
    createdAt: number;
    subject: { subjectName: string };
    student: { firstName: string; lastName: string };
  }>;
} & SchoolProfileData;

async function getAuthPayload(request: Request, context: any) {
  const cookieHeader = request.headers.get("Cookie");
  const token = await authCookie.parse(cookieHeader || "");
  if (!token) return null;

  const isValid = await jwt.verify(
    token,
    context.cloudflare.env.AUTH_SESSION_SECRET,
  );
  if (!isValid) return null;

  const decoded = jwt.decode(token);
  return decoded.payload as { id: number; email: string; role: string };
}

// --- Loader ---
export async function loader({ request, context }: LoaderFunctionArgs) {
  const payload = await getAuthPayload(request, context);
  if (!payload) return redirect("/auth/login");

  const services = context.services as any;

  const account = await services.users.findUserByEmail(payload.email);

  let roleData: Record<string, any> | null = null;
  let teacherSubjects: { id: number; subjectName: string }[] = [];
  let teacherClasses: { id: number; name: string }[] = [];
  let recentGrades: any[] = [];

  if (payload.role === "teacher") {
    roleData = await services.teacher.getTeacherByEmail(payload.email);
    if (roleData) {
      teacherSubjects = await services.teacherSubject.getSubjectsByTeacher(
        roleData.id,
      );
      teacherClasses = await services.teacherClass.getFormClassesByTeacher(
        roleData.id,
      );
      recentGrades = await services.grade.getAll({
        teacherId: roleData.id,
        limit: 5,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
    }
  } else if (payload.role === "student") {
    roleData = await services.student.getByEmail(payload.email);
    if (roleData) {
      recentGrades = await services.grade.getAll({
        studentId: roleData.id,
        limit: 5,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
    }
  }

  const schoolProfile = isAdminRole(payload.role)
    ? await loadSchoolProfile(context.services)
    : emptySchoolProfile;

  return {
    account: account
      ? {
          id: account.id,
          email: account.email,
          role: account.role,
          firstName: account.firstName,
          lastName: account.lastName,
          phone: account.phone,
          preferredLanguage: account.preferredLanguage,
          avatarUrl: account.avatarUrl,
          createdAt: account.createdAt,
        }
      : null,
    role: payload.role,
    roleData,
    teacherSubjects,
    teacherClasses,
    recentGrades,
    ...schoolProfile,
  };
}

// --- Action ---
export async function action({ request, context }: ActionFunctionArgs) {
  const payload = await getAuthPayload(request, context);
  if (!payload) return redirect("/auth/login");

  const services = context.services as any;
  const form = await request.formData();
  const actionType = form.get("action") as string | null;

  try {
    if (actionType === "update_profile") {
      const preferredLanguage = String(form.get("preferredLanguage") ?? "en");
      const avatarUrl = String(form.get("avatarUrl") ?? "");

      if (payload.role === "teacher") {
        const roleData = await services.teacher.getTeacherByEmail(
          payload.email,
        );
        if (!roleData) {
          return {
            error: "No teacher record linked to your account.",
            action: "update_profile",
          };
        }
        const updated = await services.teacher.updateTeacherById(roleData.id, {
          firstName: String(form.get("firstName") ?? ""),
          lastName: String(form.get("lastName") ?? ""),
          phone: String(form.get("phone") ?? ""),
          address: String(form.get("address") ?? ""),
          qualification: String(form.get("qualification") ?? ""),
        });
        // preferredLanguage is an account-level preference, so it lives on
        // `users` even for roles whose name/contact info lives elsewhere.
        await services.users.updateProfile(payload.id, {
          preferredLanguage,
          avatarUrl,
        });
        if (!updated) {
          return {
            error: "Failed to update profile.",
            action: "update_profile",
          };
        }
        return { success: true, action: "update_profile" };
      }

      if (payload.role === "student") {
        const roleData = await services.student.getByEmail(payload.email);
        if (!roleData) {
          return {
            error: "No student record linked to your account.",
            action: "update_profile",
          };
        }
        const updated = await services.student.update(roleData.id, {
          firstName: String(form.get("firstName") ?? ""),
          lastName: String(form.get("lastName") ?? ""),
          phone: String(form.get("phone") ?? ""),
          address: String(form.get("address") ?? ""),
          guardianName: String(form.get("guardianName") ?? ""),
          guardianPhone: String(form.get("guardianPhone") ?? ""),
        });
        await services.users.updateProfile(payload.id, {
          preferredLanguage,
          avatarUrl,
        });
        if (!updated) {
          return {
            error: "Failed to update profile.",
            action: "update_profile",
          };
        }
        return { success: true, action: "update_profile" };
      }

      // Admin / Finance / Parent: name, phone, and language all live on `users`.
      const updated = await services.users.updateProfile(payload.id, {
        firstName: String(form.get("firstName") ?? ""),
        lastName: String(form.get("lastName") ?? ""),
        phone: String(form.get("accountPhone") ?? ""),
        preferredLanguage,
        avatarUrl,
      });
      if (!updated) {
        return { error: "Failed to update profile.", action: "update_profile" };
      }
      return { success: true, action: "update_profile" };
    }

    // Dedicated action for the inline language dropdown on the Account
    // Information card. Kept separate from `update_profile` so that
    // changing just the language never touches firstName/lastName/phone
    // (the update_profile branches above pull those from the form too,
    // and would overwrite them with empty strings if reused here).
    if (actionType === "update_language") {
      const preferredLanguage = String(form.get("preferredLanguage") ?? "en");
      const updated = await services.users.updateProfile(payload.id, {
        preferredLanguage,
      });
      if (!updated) {
        return {
          error: "Failed to update language.",
          action: "update_language",
        };
      }
      return { success: true, action: "update_language" };
    }

    if (actionType === "change_password") {
      const currentPassword = String(form.get("currentPassword") ?? "");
      const newPassword = String(form.get("newPassword") ?? "");
      const confirmPassword = String(form.get("confirmPassword") ?? "");

      if (newPassword.length < 8) {
        return {
          error: "New password must be at least 8 characters.",
          action: "change_password",
        };
      }
      if (newPassword !== confirmPassword) {
        return {
          error: "New password and confirmation do not match.",
          action: "change_password",
        };
      }

      const result = await services.users.changePassword(
        payload.id,
        currentPassword,
        newPassword,
      );
      if (result.error) {
        return { error: result.error, action: "change_password" };
      }
      return { success: true, action: "change_password" };
    }

    return { error: "Unknown action" };
  } catch (err: any) {
    console.error("profile action error:", err);
    return { error: err?.message || "Server error" };
  }
}

// --- Helpers ---
function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: "Administrator",
    teacher: "Teacher",
    student: "Student",
    parent: "Parent / Guardian",
    finance: "Finance",
  };
  return labels[role] || role;
}

function formatDate(timestamp?: number | null): string {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function FieldBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      {/* No border here — signals "display only" at a glance, in contrast
          with the bordered, white-background Preferred Language <select>. */}
      <div className="min-h-[38px] flex items-center rounded-lg bg-gray-50 px-3.5 py-2 text-sm font-medium text-foreground">
        {value ?? "—"}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-purple/10 text-purple text-xs font-medium px-3 py-1 mr-1.5 mb-1.5">
      {children}
    </span>
  );
}

function SectionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// --- Page ---
export default function ProfilePage() {
  const {
    account,
    role,
    roleData,
    teacherSubjects,
    teacherClasses,
    recentGrades,
    school,
    campuses,
    totalTeachers,
    totalStudents,
  } = useLoaderData<ProfileLoaderData>();
  const fetcher = useFetcher<any>();
  const passwordFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();
  const { setLanguage, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const initialTab =
    isAdminRole(role) && searchParams.get("tab") === "school"
      ? "school"
      : "profile";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [preferredLanguage, setPreferredLanguage] = useState(
    account?.preferredLanguage ?? "en",
  );

  // Independent visibility toggles so revealing one password field
  // doesn't reveal the others.
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isTeacher = role === "teacher";
  const isStudent = role === "student";
  const isAdmin = isAdminRole(role);
  const hasRoleData = (isTeacher || isStudent) && roleData;

  const fullName = hasRoleData
    ? `${roleData.firstName} ${roleData.lastName}`
    : account?.firstName || account?.lastName
      ? `${account?.firstName ?? ""} ${account?.lastName ?? ""}`.trim()
      : (account?.email ?? "Unknown user");

  const initial = fullName.charAt(0).toUpperCase();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      toast.success("Profile updated.");
    }
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    if (passwordFetcher.state === "idle" && passwordFetcher.data) {
      if (passwordFetcher.data.success) {
        toast.success("Password changed successfully.");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      }
      if (passwordFetcher.data.error) {
        toast.error(passwordFetcher.data.error);
      }
    }
  }, [passwordFetcher.state, passwordFetcher.data]);

  useEffect(() => {
    if (languageFetcher.state === "idle" && languageFetcher.data) {
      if (languageFetcher.data.success) {
        setLanguage(preferredLanguage === "sw" ? "sw" : "en");
        toast.success(t("languageUpdated"));
      }
      if (languageFetcher.data.error) {
        toast.error(languageFetcher.data.error);
        // Revert the dropdown to the last known-good value from the server
        // since the save failed.
        setPreferredLanguage(account?.preferredLanguage ?? "en");
      }
    }
  }, [
    languageFetcher.state,
    languageFetcher.data,
    account?.preferredLanguage,
    preferredLanguage,
    setLanguage,
    t,
  ]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("_method", "PUT");
    fd.set("action", "change_password");
    fd.set("currentPassword", passwordForm.currentPassword);
    fd.set("newPassword", passwordForm.newPassword);
    fd.set("confirmPassword", passwordForm.confirmPassword);
    passwordFetcher.submit(fd, { method: "post", action: "/profile" });
  };

  const handleLanguageChange = (value: string) => {
    setPreferredLanguage(value);
    const fd = new FormData();
    fd.set("action", "update_language");
    fd.set("preferredLanguage", value);
    languageFetcher.submit(fd, { method: "post", action: "/profile" });
  };

  return (
    <div className="min-h-screen">
      <div className="space-y-6">
        <PageBreadcrumb />
        <div className="max-w-2xl">
        <PageHeader title="My Profile" description="Your account information" />

        {/* Hero header */}
        <div className="rounded-2xl border border-border shadow-sm overflow-hidden width-full">
          <div
            className="px-6 py-7 sm:px-8"
            style={{ background: "var(--gradient-purple-light)" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="h-20 w-20 flex items-center justify-center rounded-full text-white text-2xl font-bold shadow-lg ring-4 ring-white shrink-0 overflow-hidden"
                  style={{ background: "var(--primary-gradient)" }}
                >
                  {account?.avatarUrl ? (
                    <img
                      src={account.avatarUrl}
                      alt={fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">
                    {fullName}
                  </p>
                  <span className="inline-block mt-1.5 rounded-full bg-purple/10 text-muted-foreground text-xs font-semibold px-3 py-1">
                    {roleLabel(role)}
                  </span>
                  {hasRoleData && (roleData.gender || roleData.address) && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {[
                        roleData.gender,
                        isStudent && roleData.dob && `Born ${roleData.dob}`,
                        roleData.address,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => setIsEditOpen(true)}
                className="hover:scale-110 hover:text-white-600 transition bg-primary-gradient text-white shadow-md py-2 px-4 rounded-[8px] cursor-pointer shrink-0"
              >
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
        </div>

        <Tabs defaultValue={initialTab}>
          <TabsList>
            <TabsTrigger value="profile" className="cursor-pointer">
              Profile
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="school" className="cursor-pointer">
                {t("schoolTab")}
              </TabsTrigger>
            )}
            <TabsTrigger value="security" className="cursor-pointer">
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-4 max-w-2xl">
            <SectionPanel title="Account Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldBox label="Email" value={account?.email} />
                <FieldBox label="Role" value={roleLabel(role)} />
                <FieldBox
                  label="Phone"
                  value={roleData?.phone || account?.phone}
                />

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">
                    {t("preferredLanguage")}
                  </p>
                  <select
                    value={preferredLanguage ?? "en"}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    disabled={languageFetcher.state === "submitting"}
                    className="min-h-[38px] w-full rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-foreground cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="en">{t("english")}</option>
                    <option value="sw">{t("swahili")}</option>
                  </select>
                </div>

                <FieldBox
                  label="Member since"
                  value={formatDate(account?.createdAt)}
                />
              </div>
            </SectionPanel>

            {isTeacher && roleData && (
              <SectionPanel title="Teacher Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <FieldBox label="Subject" value={roleData.subject} />
                  <FieldBox
                    label="Qualification"
                    value={roleData.qualification}
                  />
                  <FieldBox
                    label="Experience"
                    value={
                      roleData.experience ? `${roleData.experience} years` : "—"
                    }
                  />
                  <FieldBox label="Status" value={roleData.status} />
                </div>
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Subjects Taught
                  </p>
                  {teacherSubjects.length > 0 ? (
                    <div className="flex flex-wrap">
                      {teacherSubjects.map((s) => (
                        <Chip key={s.id}>{s.subjectName}</Chip>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      None assigned yet
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Classes Assigned
                  </p>
                  {teacherClasses.length > 0 ? (
                    <div className="flex flex-wrap">
                      {teacherClasses.map((c) => (
                        <Chip key={c.id}>{c.name}</Chip>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      None assigned yet
                    </p>
                  )}
                </div>
              </SectionPanel>
            )}

            {isTeacher && roleData && (
              <SectionPanel title="Recent Results Recorded">
                {recentGrades.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No results recorded yet.
                  </p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Student</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentGrades.map((g) => (
                          <TableRow key={g.id}>
                            <TableCell>
                              {g.student.firstName} {g.student.lastName}
                            </TableCell>
                            <TableCell>{g.subject.subjectName}</TableCell>
                            <TableCell>{g.score}</TableCell>
                            <TableCell>{g.grade}</TableCell>
                            <TableCell>{formatDate(g.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </SectionPanel>
            )}
            {isTeacher && !roleData && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                <p className="text-sm text-amber-700">
                  We couldn&apos;t find a teacher record linked to your account
                  yet. Contact your school admin to have one connected.
                </p>
              </div>
            )}

            {isStudent && roleData && (
              <SectionPanel title="Student Details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldBox label="Guardian" value={roleData.guardianName} />
                  <FieldBox
                    label="Guardian phone"
                    value={roleData.guardianPhone}
                  />
                  <FieldBox label="Grade" value={roleData.grade} />
                  <FieldBox
                    label="Enrollment date"
                    value={roleData.enrollmentDate}
                  />
                  <FieldBox label="Status" value={roleData.status} />
                </div>
              </SectionPanel>
            )}
            {isStudent && !roleData && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                <p className="text-sm text-amber-700">
                  We couldn&apos;t find a student record linked to your account
                  yet. Contact your school admin to have one connected.
                </p>
              </div>
            )}

            {isStudent && roleData && (
              <SectionPanel
                title="Recent Academic Performance"
                description="Your most recent results. Results aren't linked to a specific term yet, so this shows the latest overall."
              >
                {recentGrades.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No results recorded yet.
                  </p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Subject</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentGrades.map((g) => (
                          <TableRow key={g.id}>
                            <TableCell>{g.subject.subjectName}</TableCell>
                            <TableCell>{g.score}</TableCell>
                            <TableCell>{g.grade}</TableCell>
                            <TableCell>{formatDate(g.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </SectionPanel>
            )}

            {role === "parent" && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
                <p className="text-sm text-blue-700">
                  No student records are linked to your account yet. This
                  feature is still being built out — check back soon.
                </p>
              </div>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="school" className="mt-4">
              <SchoolProfileView
                school={school}
                campuses={campuses}
                totalTeachers={totalTeachers}
                totalStudents={totalStudents}
                addCampusReturnTo="/profile?tab=school"
              />
            </TabsContent>
          )}

          <TabsContent value="security" className="mt-4 max-w-2xl">
            <SectionPanel
              title="Change Password"
              description="Choose a new password with at least 8 characters."
            >
              <form
                onSubmit={handlePasswordSubmit}
                className="space-y-4 max-w-sm"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                      aria-label={
                        showCurrentPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                      aria-label={
                        showNewPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showNewPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      tabIndex={-1}
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="bg-primary-gradient text-white py-2 px-4 rounded-[8px]"
                >
                  {passwordFetcher.state === "submitting"
                    ? "Updating..."
                    : "Update Password"}
                </Button>
              </form>
            </SectionPanel>
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
          onLanguageChange={(value: string) => {
            setPreferredLanguage(value);
            setLanguage(value === "sw" ? "sw" : "en");
          }}
        />
      )}
    </div>
  );
}
