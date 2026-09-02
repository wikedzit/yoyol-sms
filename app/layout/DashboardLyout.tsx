import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, redirect, useLoaderData } from 'react-router';
import { authCookie } from 'workers/utils/cookies.server';
import { Button } from '~/components/ui/button';
import AppSidebar from '~/Dahsboard/Sidebar';
import jwt from '@tsndr/cloudflare-worker-jwt';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { ThemeToggle } from '~/components/ui/theme-toggle';
import { useTheme } from 'next-themes';

export async function loader({ request, context }: any) {
  const cookieHeader = request.headers.get('Cookie');
  const token = await authCookie.parse(cookieHeader || '');

  if (!token) {
    return redirect('/auth/login');
  }

  const isValid = await jwt.verify(
    token,
    context.cloudflare.env.AUTH_SESSION_SECRET
  );
  if (!isValid) {
    return redirect('/auth/login');
  }

  const payload = jwt.decode(token);
  const user = payload.payload as { id: number; email: string; role: string };

  return { user: { email: user.email, role: user.role } };
}

const handleLogout = async () => {
  await fetch('/logout', { method: 'POST' });
  window.location.href = '/auth/login';
};

const DashboardLayout = () => {
  const { user } = useLoaderData<{ user: { email: string; role: string } }>();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="h-screen bg-background"
        style={{
          backgroundImage: 'url(/assets/awesome-bg.jpg)',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundPosition: 'left top',
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
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
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
              mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
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
                  className="lg:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>

                <h1 className="text-lg lg:text-xl md:text-sm sm:text-xs font-semibold text-foreground">
                  Student Management System
                </h1>
              </div>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition cursor-pointer outline-none">
                    <div className="h-7 w-7 flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                      {user?.email?.charAt(0).toUpperCase() ?? 'U'}
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium text-foreground truncate max-w-[150px]">
                        {user?.email}
                      </div>
                    </div>
                    <ChevronDown className="hidden md:block h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      Profile
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      Settings
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
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                    }}
                  >
                    <span className="text-sm font-medium">Theme</span>
                    <ThemeToggle />
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onSelect={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>

            <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-background/50">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;