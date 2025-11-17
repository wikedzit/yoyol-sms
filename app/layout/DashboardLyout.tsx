import { Bell, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router';
import { Button } from '~/components/ui/button';
import AppSidebar from '~/Dahsboard/Sidebar';

const DashboardLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Smooth slide-in animation
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
          {/* --- Desktop Sidebar --- */}
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

          {/* --- Mobile Sidebar (Animated) --- */}
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
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div
              className="flex-1 overflow-y-auto"
              // Auto close when link clicked inside AppSidebar
              onClick={() => setMobileMenuOpen(false)}
            >
              <AppSidebar />
            </div>
          </div>

          {/* Overlay (fades in/out) */}
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
                {/* Mobile Menu Button */}
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

              <div className="flex items-center">
                <Bell className="h-6 w-6" />
              </div>
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
