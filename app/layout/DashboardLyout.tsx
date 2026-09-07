import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, redirect, useLoaderData } from "react-router";
import { authCookie } from "workers/utils/cookies.server";
import { Button } from "~/components/ui/button";
import AppSidebar from "~/Dahsboard/Sidebar";
import jwt from "@tsndr/cloudflare-worker-jwt";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ThemeToggle } from "~/components/ui/theme-toggle";
import { useTheme } from "next-themes";
import { LogoutConfirmDialog } from "~/components/LogoutConfirmDialog";
import { LanguageProvider, useLanguage, type Language } from "~/lib/i18n";

export async function loader({ request, context }: any) {
  const cookieHeader = request.headers.get("Cookie");
  const token = await authCookie.parse(cookieHeader || "");

  if (!token) {
    return redirect("/auth/login");
  }

  const isValid = await jwt.verify(
    token,
    context.cloudflare.env.AUTH_SESSION_SECRET,
  );
  if (!isValid) {
    return redirect("/auth/login");
  }

  const payload = jwt.decode(token);
  const user = payload.payload as { id: number; email: string; role: string };
  const account = await context.services.users.findUserByEmail(user.email);

  return {
    user: {
      email: user.email,
      role: user.role,
      firstName: account?.firstName ?? null,
      lastName: account?.lastName ?? null,
      preferredLanguage: account?.preferredLanguage ?? 'en',
      avatarUrl: account?.avatarUrl ?? null,
    },
  };
}

const DashboardLayout = () => {
  const { user } = useLoaderData<{
    user: {
      email: string;
      role: string;
      firstName: string | null;
      lastName: string | null;
      preferredLanguage: string | null;
      avatarUrl: string | null;
    };
  }>();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const displayName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ") || user?.email;

  return (
    <LanguageProvider initialLanguage={user.preferredLanguage}>
      <DashboardContent
        user={user}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isLogoutConfirmOpen={isLogoutConfirmOpen}
        setIsLogoutConfirmOpen={setIsLogoutConfirmOpen}
        theme={theme}
        setTheme={setTheme}
      />
    </LanguageProvider>
  );
};

function DashboardContent({
  user,
  mobileMenuOpen,
  setMobileMenuOpen,
  isLogoutConfirmOpen,
  setIsLogoutConfirmOpen,
  theme,
  setTheme,
}: any) {
  const { t } = useLanguage();
  const displayName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ") || user?.email;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="h-screen bg-background"
        style={{
          backgroundImage: "url(/assets/awesome-bg.jpg)",
          backgroundAttachment: "fixed",
          backgroundSize: "cover",
          backgroundPosition: "left top",
        }}
      >
        <div className="flex h-full backdrop-blur-[2px]">
          {/* Desktop Sidebar */}
          <div className="hidden lg:flex bg-card/95 backdrop-blur-md border-r border-border h-full w-[286px] flex-col flex-shrink-0 transition-colors">
            <div className="bg-card border-b border-border h-[70px] flex-shrink-0 flex items-center justify-center">
              <img
                src="/assets/auth-page/yoyol-logo.png"
                alt="yoyol-logo"
                className="w-20"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              <AppSidebar />
            </div>
          </div>

          {/* Mobile Sidebar */}
          <div
            className={`fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden border-r border-border
            ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            <div className="p-4 flex items-center justify-between border-b border-border">
              <img
                src="/assets/auth-page/yoyol-logo.png"
                alt="yoyol-logo"
                className="w-20"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-11 px-6 w-full sm:w-auto hover:scale-110 hover:text-white-600 transition cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div
              className="flex-1 overflow-y-auto"
              onClick={() => setMobileMenuOpen(false)}
            >
              <AppSidebar />
            </div>
          </div>

          <div
            className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ease-in-out ${
              mobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
            }`}
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Header & Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-card/95 backdrop-blur-md border-b border-border h-[70px] flex items-center justify-between px-4 lg:px-8 flex-shrink-0 relative transition-colors">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-11 px-6 w-full sm:w-auto hover:scale-110 hover:text-white-600 transition cursor-pointer"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>

                <h1 className="text-lg lg:text-xl md:text-sm sm:text-xs font-semibold text-foreground">
                  {t('studentManagementSystem')}
                </h1>
              </div>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition cursor-pointer outline-none">
                    <div className="h-7 w-7 flex items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                      ) : displayName?.charAt(0).toUpperCase() ?? "U"}
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium text-foreground truncate max-w-[150px]">
                        {displayName}
                      </div>
                    </div>
                    <ChevronDown className="hidden md:block h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>{t('myAccount')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      {t('profile')}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      {t('settings')}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* 
                    Entire row is interactive:
                    - Full edge-to-edge hover background.
                    - Clicking anywhere on the row toggles the theme.
                    - e.preventDefault() prevents dropdown auto-close.
                  */}
                  <DropdownMenuItem
                    className="flex items-center justify-between cursor-pointer focus:bg-accent focus:text-accent-foreground select-none"
                    onSelect={(e) => {
                      e.preventDefault();
                      setTheme(theme === "dark" ? "light" : "dark");
                    }}
                  >
                    <span className="text-sm font-medium">{t('theme')}</span>
                    <ThemeToggle />
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onSelect={() => setIsLogoutConfirmOpen(true)}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <LogoutConfirmDialog
                open={isLogoutConfirmOpen}
                onOpenChange={setIsLogoutConfirmOpen}
              />
            </header>

            <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-background/50">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
