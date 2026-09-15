import { useState, useEffect } from "react";
import { redirect } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import jwt from "@tsndr/cloudflare-worker-jwt";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Settings2,
  Users,
} from "lucide-react";
import { authCookie } from "workers/utils/cookies.server";
import { PageHeader } from "~/components/ui/PageHeader";
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
import { useLanguage } from "~/lib/i18n";
import {
  isAdminRole,
  isSuperAdminRole,
  permissionsForRole,
  type Permission,
} from "~/lib/permissions";

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
    jobTitle: string | null;
    staffId: string | null;
    bio: string | null;
    accountStatus: string | null;
    lastLoginAt: number | null;
    twoFactorEnabled: boolean;
    twoFactorConfirmedAt: number | null;
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
  stats: {
    students: number;
    teachers: number;
    recentResults: number;
  };
  school: {
    name: string;
    address: string | null;
    registrationNumber: string | null;
  } | null;
};

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
  const role =
    account?.role?.trim().toLowerCase() || payload.role.trim().toLowerCase();

  let roleData: Record<string, any> | null = null;
  let teacherSubjects: { id: number; subjectName: string }[] = [];
  let teacherClasses: { id: number; name: string }[] = [];
  let recentGrades: any[] = [];
  let stats = { students: 0, teachers: 0, recentResults: 0 };
  let profileSchool: ProfileLoaderData["school"] = null;

  if (role === "teacher") {
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
  } else if (role === "student") {
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

  if (isAdminRole(role)) {
    const [students, teachers, results, schools] = await Promise.all([
      services.student.countAll(),
      services.teacher.countAll(),
      services.grade.getAll({
        limit: 5,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
      services.school.getAll(),
    ]);
    recentGrades = results;
    profileSchool = schools[0]
      ? {
        name: schools[0].name,
        address: schools[0].address,
        registrationNumber: schools[0].registrationNumber,
      }
      : null;
    stats = { students, teachers, recentResults: results.length };
  }

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
        jobTitle: account.jobTitle,
        staffId: account.staffId,
        bio: account.bio,
        accountStatus: account.accountStatus,
        lastLoginAt: account.lastLoginAt,
        twoFactorEnabled: account.twoFactorEnabled,
        twoFactorConfirmedAt: account.twoFactorConfirmedAt,
        createdAt: account.createdAt,
      }
      : null,
    role,
    roleData,
    teacherSubjects,
    teacherClasses,
    recentGrades,
    stats,
    school: profileSchool,
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
    if (actionType === "setup_2fa") {
      const setup = await services.users.beginTwoFactorSetup(payload.id);
      return setup
        ? { success: true, action: "setup_2fa", ...setup }
        : { error: "Unable to start two-factor setup.", action: "setup_2fa" };
    }

    if (actionType === "confirm_2fa") {
      const result = await services.users.confirmTwoFactorSetup(
        payload.id,
        String(form.get("code") ?? ""),
      );
      return result
        ? { success: true, action: "confirm_2fa", ...result }
        : { error: "Invalid authentication code.", action: "confirm_2fa" };
    }

    if (actionType === "disable_2fa") {
      const disabled = await services.users.disableTwoFactor(
        payload.id,
        String(form.get("password") ?? ""),
      );
      return disabled
        ? { success: true, action: "disable_2fa" }
        : { error: "Current password is incorrect.", action: "disable_2fa" };
    }

    if (actionType === "update_profile") {
      const preferredLanguage = String(form.get("preferredLanguage") ?? "en");
      const avatarUrl = String(form.get("avatarUrl") ?? "");
      const administratorProfile = {
        jobTitle: String(form.get("jobTitle") ?? ""),
        staffId: String(form.get("staffId") ?? ""),
        bio: String(form.get("bio") ?? ""),
      };

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
          ...administratorProfile,
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
          ...administratorProfile,
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
        ...administratorProfile,
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
    super_admin: "Super Administrator",
    admin: "Administrator",
    teacher: "Teacher",
    student: "Student",
    parent: "Parent / Guardian",
    finance: "Finance",
  };
  return labels[role] || role;
}

function permissionLabel(permission: Permission): string {
  const labels: Record<Permission, string> = {
    "dashboard.view": "Dashboard overview",
    "students.view": "View students",
    "students.manage": "Manage students",
    "teachers.view": "View teachers",
    "teachers.manage": "Manage teachers",
    "admissions.manage": "Manage admissions",
    "attendance.manage": "Manage attendance",
    "timetable.manage": "Manage timetable",
    "finance.view": "View finance",
    "finance.manage": "Manage finance",
    "grades.manage": "Manage grades",
    "reports.view": "View reports",
    "admin-management.manage": "Manage administrators",
    "system-settings.manage": "Manage system settings",
    "roles.manage": "Manage roles and permissions",
    "audit.view": "View audit logs",
    "billing.manage": "Manage billing",
    "notifications.manage": "Manage notifications",
    "schools.switch": "Switch schools",
  };
  return labels[permission];
}

function formatDate(timestamp?: number | null): string {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatRelativeTime(timestamp?: number | null): string {
  if (!timestamp) return "No activity yet";
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
    stats,
    school,
  } = useLoaderData<ProfileLoaderData>();
  const fetcher = useFetcher<any>();
  const passwordFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();
  const twoFactorFetcher = useFetcher<any>();
  const { setLanguage, t } = useLanguage();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [preferredLanguage, setPreferredLanguage] = useState(
    account?.preferredLanguage ?? "en",
  );
  const [timezone, setTimezone] = useState("Detecting timezone...");
  const [activeTab, setActiveTab] = useState("profile");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");

  // Independent visibility toggles so revealing one password field
  // doesn't reveal the others.
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isTeacher = role === "teacher";
  const isStudent = role === "student";
  const isAdmin = isAdminRole(role);
  const isSuperAdmin = isSuperAdminRole(role);
  const rolePermissions = Array.from(permissionsForRole(role));
  const hasRoleData = (isTeacher || isStudent) && roleData;
  const isTwoFactorEnabled =
    twoFactorFetcher.data?.action === "disable_2fa" &&
      twoFactorFetcher.data?.success
      ? false
      : account?.twoFactorEnabled === true ||
      (twoFactorFetcher.data?.action === "confirm_2fa" &&
        twoFactorFetcher.data?.success === true);

  const fullName = hasRoleData
    ? `${roleData.firstName} ${roleData.lastName}`
    : account?.firstName || account?.lastName
      ? `${account?.firstName ?? ""} ${account?.lastName ?? ""}`.trim()
      : (account?.email ?? "Unknown user");

  const initial = fullName.charAt(0).toUpperCase();

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time");
  }, []);

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

  const startTwoFactorSetup = () => {
    twoFactorFetcher.submit(
      { action: "setup_2fa" },
      { method: "post", action: "/profile" },
    );
  };

  const confirmTwoFactorSetup = (event: React.FormEvent) => {
    event.preventDefault();
    twoFactorFetcher.submit(
      { action: "confirm_2fa", code: twoFactorCode },
      { method: "post", action: "/profile" },
    );
  };

  const disableTwoFactor = (event: React.FormEvent) => {
    event.preventDefault();
    twoFactorFetcher.submit(
      { action: "disable_2fa", password: twoFactorPassword },
      { method: "post", action: "/profile" },
    );
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title="My Profile" description="Your account information" />

        {/* Hero header */}
        <div className="rounded-2xl border border-border shadow-sm overflow-hidden">
          <div
            className="px-6 py-6 sm:px-8"
            style={{ background: "var(--gradient-purple-light)" }}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
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
                  <p className="text-2xl font-bold text-foreground">
                    {fullName}
                  </p>
                  <span className="inline-block mt-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
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
              <div className="flex items-center gap-2 self-end sm:self-start">
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  title={account?.phone ? "Call phone number" : "No phone number"}
                  className="rounded-lg bg-card/80"
                >
                  <a
                    href={account?.phone ? `tel:${account.phone}` : undefined}
                    aria-disabled={!account?.phone}
                    className={!account?.phone ? "pointer-events-none opacity-50" : undefined}
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  title={account?.email ? "Email account" : "No email address"}
                  className="rounded-lg bg-card/80"
                >
                  <a
                    href={account?.email ? `mailto:${account.email}` : undefined}
                    aria-disabled={!account?.email}
                    className={!account?.email ? "pointer-events-none opacity-50" : undefined}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  onClick={() => setIsEditOpen(true)}
                  className="bg-primary-gradient text-white shadow-md rounded-lg cursor-pointer"
                >
                  Edit profile
                </Button>
              </div>
            </div>
            {account?.bio && (
              <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
                {account.bio}
              </p>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Students managed", value: stats.students, icon: Users },
              { label: "Teachers managed", value: stats.teachers, icon: Users },
              {
                label: "Recent results",
                value: stats.recentResults,
                icon: Activity,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid h-12 w-full grid-cols-4 rounded-xl border border-primary/10 bg-primary/5 p-1 shadow-sm">
            <TabsTrigger
              value="profile"
              className="cursor-pointer rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary data-[state=active]:border-primary/15 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="cursor-pointer rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary data-[state=active]:border-primary/15 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="cursor-pointer rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary data-[state=active]:border-primary/15 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Preferences
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="cursor-pointer rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary data-[state=active]:border-primary/15 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-6">
                <SectionPanel title="Account Information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldBox label="Email" value={account?.email} />
                    <FieldBox label="Role" value={roleLabel(role)} />
                    {isAdmin && (
                      <>
                        <FieldBox
                          label="Account status"
                          value={account?.accountStatus ?? "active"}
                        />
                        <FieldBox label="Job title" value={account?.jobTitle} />
                        <FieldBox label="Staff ID" value={account?.staffId} />
                        <FieldBox
                          label="Last login"
                          value={formatDate(account?.lastLoginAt)}
                        />
                      </>
                    )}
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

                {isAdmin && (
                  <SectionPanel
                    title={isSuperAdmin ? "System access" : "My permissions"}
                    description={
                      isSuperAdmin
                        ? "Full system access across schools, administration, and settings."
                        : "Your operational access is assigned by a Super Administrator."
                    }
                  >
                    <div className="mb-4 flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {isSuperAdmin
                            ? "Full system access"
                            : "School operations access"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isSuperAdmin
                            ? "You can manage administrators, roles, and system settings."
                            : "Permissions are read-only here and cannot be changed from your own profile."}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-purple/10 px-3 py-1 text-xs font-semibold text-purple">
                        {isSuperAdmin ? "Global" : "Assigned"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rolePermissions.map((permission) => (
                        <div
                          key={permission}
                          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                        >
                          <span className="text-green-600" aria-hidden="true">
                            ✓
                          </span>
                          {permissionLabel(permission)}
                        </div>
                      ))}
                    </div>
                  </SectionPanel>
                )}

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
              </div>

              {isAdmin && (
                <aside className="space-y-4">
                  <SectionPanel title="Security snapshot">
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                        <span className="text-muted-foreground">Two-factor auth</span>
                        <span
                          className={
                            isTwoFactorEnabled
                              ? "font-semibold text-green-600"
                              : "font-semibold text-amber-600"
                          }
                        >
                          {isTwoFactorEnabled ? "Enabled" : "Not configured"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                        <span className="text-muted-foreground">Account status</span>
                        <span className="font-semibold text-green-600">{account?.accountStatus ?? "Active"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
                        <span className="text-muted-foreground">Last login</span>
                        <span className="font-semibold text-foreground">{formatRelativeTime(account?.lastLoginAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Member since</span>
                        <span className="font-semibold text-foreground">{formatDate(account?.createdAt)}</span>
                      </div>
                    </div>
                  </SectionPanel>

                  <SectionPanel title="School">
                    {school ? (
                      <div className="rounded-lg bg-primary/10 p-3">
                        <p className="text-sm font-semibold text-primary">{school.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{school.address || "Address not configured"}</p>
                        {school.registrationNumber && (
                          <p className="mt-2 text-[11px] text-muted-foreground">Registration: {school.registrationNumber}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No school has been configured yet.</p>
                    )}
                  </SectionPanel>

                  <SectionPanel title="Quick actions">
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setActiveTab("security")}
                      >
                        Change password
                        <span aria-hidden="true">›</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setActiveTab("activity")}
                      >
                        View activity
                        <span aria-hidden="true">›</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setIsEditOpen(true)}
                      >
                        Update contact info
                        <span aria-hidden="true">›</span>
                      </Button>
                    </div>
                  </SectionPanel>
                </aside>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6 mt-4">
            <SectionPanel
              title="Recent activity"
              description="Your latest recorded activity in the system."
            >
              <div className="space-y-4">
                {(account?.lastLoginAt || recentGrades.length > 0) ? (
                  <>
                    {account?.lastLoginAt && (
                      <div className="flex items-start gap-3">
                        <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Signed in to the account
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatRelativeTime(account.lastLoginAt)}
                          </p>
                        </div>
                      </div>
                    )}
                    {recentGrades.map((grade) => (
                      <div key={grade.id} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {role === "teacher"
                              ? `Recorded ${grade.grade} for ${grade.student.firstName} ${grade.student.lastName}`
                              : `Received ${grade.grade} in ${grade.subject.subjectName}`}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatRelativeTime(grade.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Clock3 className="h-5 w-5" />
                    No recent activity to display.
                  </div>
                )}
              </div>
            </SectionPanel>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6 mt-4">
            <SectionPanel
              title="Preferences"
              description="Control how the system feels and communicates with you."
            >
              <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                  <Settings2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Language</p>
                    <p className="text-xs text-muted-foreground">
                      {preferredLanguage === "sw" ? "Swahili" : "English"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                  <Clock3 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Timezone</p>
                    <p className="text-xs text-muted-foreground">{timezone}</p>
                  </div>
                </div>
              </div>
            </SectionPanel>
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
              <SectionPanel
                title="Two-factor authentication"
                description="Protect your account with a time-based code from an authenticator app."
              >
                {isTwoFactorEnabled ? (
                  <div className="space-y-4 max-w-xl">
                    <div className="flex items-center gap-3 rounded-lg bg-green-500/10 px-4 py-3 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span>Two-factor authentication is enabled.</span>
                    </div>
                    <form onSubmit={disableTwoFactor} className="max-w-sm space-y-3">
                      <label className="block text-sm font-medium text-foreground">
                        Current password to disable 2FA
                      </label>
                      <Input
                        type="password"
                        value={twoFactorPassword}
                        onChange={(event) => setTwoFactorPassword(event.target.value)}
                        required
                      />
                      <Button type="submit" variant="outline">
                        {twoFactorFetcher.state === "submitting" ? "Disabling..." : "Disable 2FA"}
                      </Button>
                    </form>
                  </div>
                ) : twoFactorFetcher.data?.uri ? (
                  <div className="grid max-w-2xl gap-5 md:grid-cols-[180px_1fr]">
                    <div className="flex items-center justify-center rounded-lg border border-border bg-white p-3">
                      <QRCodeSVG value={twoFactorFetcher.data.uri} size={150} />
                    </div>
                    <form onSubmit={confirmTwoFactorSetup} className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Scan this QR code with your authenticator app, then enter the six-digit code it generates.
                      </p>
                      <Input
                        value={twoFactorCode}
                        onChange={(event) => setTwoFactorCode(event.target.value)}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        maxLength={6}
                        required
                      />
                      <p className="break-all text-xs text-muted-foreground">
                        Manual key: {twoFactorFetcher.data.secret}
                      </p>
                      <Button type="submit" disabled={twoFactorCode.length < 6}>
                        {twoFactorFetcher.state === "submitting" ? "Confirming..." : "Enable 2FA"}
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Not configured.</p>
                    <Button type="button" onClick={startTwoFactorSetup}>
                      {twoFactorFetcher.state === "submitting" ? "Preparing..." : "Set up authenticator app"}
                    </Button>
                  </div>
                )}
                {twoFactorFetcher.data?.error && (
                  <p className="mt-3 text-sm text-destructive">{twoFactorFetcher.data.error}</p>
                )}
                {twoFactorFetcher.data?.recoveryCodes && (
                  <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">Save your recovery codes</p>
                    <p className="mt-1 text-xs text-amber-800">Each code can be used once if you lose access to your authenticator app.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-amber-950">
                      {twoFactorFetcher.data.recoveryCodes.map((code: string) => (
                        <span key={code} className="rounded bg-white px-2 py-1">{code}</span>
                      ))}
                    </div>
                  </div>
                )}
              </SectionPanel>

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
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {isEditOpen && (
        <EditProfileModal
          open={isEditOpen}
          setOpen={setIsEditOpen}
          fetcher={fetcher}
          role={role}
          account={account ?? undefined}
          roleData={roleData ?? undefined}
          onLanguageChange={(value: string) => {
            setPreferredLanguage(value);
            setLanguage(value === "sw" ? "sw" : "en");
          }}
        />
      )}
    </div>
  );
}
