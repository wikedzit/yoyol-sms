import { ChevronDown, LogOut, Menu, Sun, X } from 'lucide-react';
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

// Loader to get the user from cookie
export async function loader({ request, context }: any) {
  const cookieHeader = request.headers.get('Cookie');
  const token = await authCookie.parse(cookieHeader || '');
9
  if (!token) {
    return redirect('/auth/login');
  }

  // Verify token validity
  const isValid = await jwt.verify(
    token,
    context.cloudflare.env.AUTH_SESSION_SECRET
  );
  if (!isValid) {
    return redirect('/auth/login');
  }
  //pyload is one displaying the email and role
  const payload = jwt.decode(token);
  const user = payload.payload as { id: number; email: string; role: string };

  return { user: { email: user.email, role: user.role } };
}

const handleLogout = async () => {
  await fetch('logout', { method: 'POST' });
  window.location.href = '/auth/login';
};

const DashboardLayout = () => {
  const { user } = useLoaderData<{ user: { email: string; role: string } }>();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="h-screen"
        style={{
          backgroundImage: 'url(/assets/awesome-bg.jpg)',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundPosition: 'left top',
        }}
      >
        <div className="flex h-full">
          <div className="hidden lg:flex bg-white border-r border-border-layout h-full w-[286px] flex-col flex-shrink-0">
            <div className="bg-white border-b border-border-layout h-[70px] flex-shrink-0 flex items-center justify-center">
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

          <div
            className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:hidden
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="p-4 flex items-center justify-between border-b border-border-layout">
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
            className={`fixed inset-0 bg-background/5 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ease-in-out ${
              mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* --- Main Content --- */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-white border-b border-border-layout h-[70px] flex items-center justify-between px-4 lg:px-8 flex-shrink-0 relative">
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
                  Student Management System
                </h1>
              </div>

              {/* user Profile Section */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100  transition cursor-pointer">
                    <div className="h-6 w-6 flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {user?.email?.charAt(0).toUpperCase() ?? 'U'}
                    </div>
                    <div className="hidden md:block text-left">
                      {/* <div className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.role?.toUpperCase() ?? ''}
                      </div> */}
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
                        {user?.email}
                      </div>
                    </div>
                    <ChevronDown className="hidden md:block h-4 w-4 text-gray-600 dark:text-gray-300" />
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
                    <Link to="." className="cursor-pointer">
                      Settings
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/*TODO: will do it (THEME) */}
                  <div className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">Theme</span>
                      </div>
                      {/* <ThemeToggle /> */}
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-red-600 cursor-pointer"
                    onSelect={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>

            <main className="flex-1 overflow-y-auto p-4 lg:p-8">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
