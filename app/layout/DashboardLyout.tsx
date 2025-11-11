//dashobard layout for sidebar an main content
import { Bell } from 'lucide-react';
import { Outlet } from 'react-router';
import AppSidebar from '~/Dahsboard/Sidebar';

const DashboardLayout = () => {
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
        <div className="w-full flex h-full">
          <div className="bg-white border-r border-border-layout h-full w-[286px] flex flex-col flex-shrink-0">
            <div className="bg-white border-b border-border-layout h-[70px] flex-shrink-0">
              <div className="flex items-center h-full px-12">
                <img
                  src="/assets/auth-page/yoyol-logo.png"
                  alt="yoyol-logo"
                  className="w-20"
                />
              </div>
            </div>
            <div className="flex-1  overflow-y-auto">
              <AppSidebar />
            </div>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white border-b border-border-layout h-[70px] py-2 flex items-center justify-between px-8 flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <h1 className="text-xl font-semibold text-foreground">
                    Student Management System
                  </h1>
                </div>
              </div>
              <div className="max-w-[280px]">
                <Bell />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
