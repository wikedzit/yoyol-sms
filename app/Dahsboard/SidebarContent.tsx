import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  Settings,
  ChevronRight,
  Landmark,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '~/lib/utils';

const mainNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Departments', href: '/departments', icon: Landmark },
  // TODO: doing it later
  // { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Classrooms', href: '/classes', icon: GraduationCap },
  { name: 'Subjects', href: '/subjects', icon: BookOpen },
  { name: 'Teachers', href: '/teachers', icon: Users },
  { name: 'Students List', href: '/students', icon: Users },
  // TODO: doing it later
  // { name: 'Grades', href: '/grades', icon: GraduationCap },
  { name: 'Attendance', href: '/attendance', icon: Calendar },
];

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();

  return (
    <div className="flex flex-col justify-between h-full border-r border-sidebar-border">
      {/* Top Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {mainNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-[7px] sidebar-item-hover',
                isActive
                  ? 'sidebar-item-active text-white'
                  : 'text-black-2020 hover:text-gray-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
              {isActive && (
                <ChevronRight className="ml-auto h-4 w-4 text-white" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom (Settings + Admin Info) */}
      <div className="p-4 border-t border-sidebar-border absolute bottom-0 w-1/5">
        {bottomNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-[7px] sidebar-item-hover mb-3',
                isActive
                  ? 'sidebar-item-active text-white'
                  : 'text-black-2020 hover:text-gray-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
              {isActive && (
                <ChevronRight className="ml-auto h-4 w-4 text-white" />
              )}
            </Link>
          );
        })}

        {/* Admin Info */}
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-semibold">
            AD
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-sidebar-foreground">Admin User</p>
            <p className="text-xs text-sidebar-foreground/60">admin@edu.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};
