import {
  LayoutDashboard,
  Users,
  BookOpen,
  DoorOpen,
  ChevronRight,
  Building2,
  GitBranch,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '~/lib/utils';

const mainNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Faculties', href: '/faculties', icon: Building2 },
  { name: 'Departments', href: '/departments', icon: GitBranch },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Classrooms', href: '/classes', icon: DoorOpen },
  { name: 'Subjects', href: '/subjects', icon: FileText },
  { name: 'Students List', href: '/students', icon: GraduationCap },
  { name: 'Teachers', href: '/teachers', icon: Users },
  { name: 'Grades', href: '/grades', icon: GraduationCap },
];
// TODO: will deal with it letter
const bottomNavigation = [
  // { name: 'Settings', href: '/settings', icon: Settings },
];

export const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full w-full lg:w-[286px] border-r border-sidebar-border bg-white">
      {/* --- Top Navigation --- */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {mainNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-[7px] sidebar-item-hover transition-colors duration-200 ease-in-out',
                isActive
                  ? 'sidebar-item-active text-white'
                  : 'text-black-2020 hover:text-gray-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.name}</span>
              {isActive && (
                <ChevronRight className="ml-auto h-4 w-4 text-white" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* --- Bottom Section (Sticky) --- */}
      <div className="p-4 border-t border-sidebar-border bg-white absolute bottom-0 w-1/5">
        {/* Settings */}
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
      </div>
    </div>
  );
};
