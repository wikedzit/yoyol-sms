import {
  LayoutDashboard,
  Users,
  BookOpen,
  DoorOpen,
  ChevronRight,
  ChevronDown,
  Building2,
  GitBranch,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '~/lib/utils';
import { useState } from 'react';

const mainNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },

  {
    name: 'Academic levels',
    icon: Building2,
    children: [
      { name: 'O-Level', href: '/levels/o-level' },
      { name: 'A-Level', href: '/levels/a-level' },
    ],
  },

  {
    name: 'Schools Setup',
    icon: Building2,
    children: [
      { name: 'School Profile', href: '/schools/profile' },
      { name: 'Academic Year', href: '/schools/academic-year' },
      { name: 'Subjects', href: '/subjects', icon: FileText },
      { name: 'Classrooms', href: '/classes', icon: DoorOpen },
    ],
  },

  { name: 'Students List', href: '/students', icon: GraduationCap },
  { name: 'Teachers', href: '/teachers', icon: Users },
  { name: 'Grades', href: '/grades', icon: GraduationCap },
];

export const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full w-full lg:w-[286px] border-r border-sidebar-border bg-white">
      {/* --- Top Navigation --- */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {mainNavigation.map((item) =>
          item.children ? (
            <SidebarParent
              key={item.name}
              item={item}
              location={location}
              onNavigate={onNavigate}
            />
          ) : (
            <SidebarLink
              key={item.name}
              item={item}
              location={location}
              onNavigate={onNavigate}
            />
          )
        )}
      </nav>
    </div>
  );
};

/* ----------------------------------------
   NORMAL LINK (no children)
---------------------------------------- */
const SidebarLink = ({ item, location, onNavigate }: any) => {
  const isActive = location.pathname === item.href;

  return (
    <Link
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
      {isActive && <ChevronRight className="ml-auto h-4 w-4 text-white" />}
    </Link>
  );
};

/* ----------------------------------------
   PARENT LINK (with children)
---------------------------------------- */
const SidebarParent = ({ item, location, onNavigate }: any) => {
  const [open, setOpen] = useState(false);

  // Is any child active?
  const isChildActive = item.children.some(
    (child: any) => location.pathname === child.href
  );

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-[7px] sidebar-item-hover transition duration-200',
          isChildActive
            ? 'sidebar-item-active text-white'
            : 'text-black-2020 hover:text-gray-900'
        )}
      >
        <item.icon className="h-5 w-5" />
        <span className="truncate">{item.name}</span>

        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="ml-8 mt-1 space-y-1">
          {item.children.map((child: any) => {
            const isActive = location.pathname === child.href;
            return (
              <Link
                key={child.name}
                to={child.href}
                onClick={onNavigate}
                className={cn(
                  'block px-3 py-2 text-sm rounded-md sidebar-item-hover transition',
                  isActive
                    ? 'sidebar-item-active text-white'
                    : 'text-black-2020 hover:text-gray-900'
                )}
              >
                {child.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
