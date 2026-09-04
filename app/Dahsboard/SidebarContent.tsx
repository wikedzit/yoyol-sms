import {
  LayoutDashboard,
  Users,
  DoorOpen,
  ChevronRight,
  ChevronDown,
  Building2,
  FileText,
  GraduationCap,
  LogOut,
  Sparkles,
} from 'lucide-react';

import { Link, useLocation } from 'react-router';
import { cn } from '~/lib/utils';
import { useState, useEffect } from 'react';
import { LogoutConfirmDialog } from '~/components/LogoutConfirmDialog';

const mainNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },

  {
    name: "Academic levels",
    icon: Building2,
    children: [
      { name: "O-Level", href: "/levels/o-level" },
      { name: "A-Level", href: "/levels/a-level" },
    ],
  },

  {
    name: "Schools Setup",
    icon: Building2,
    children: [
      { name: "School Profile", href: "/schools/profile" },
      { name: "Academic Year", href: "/schools/academic-year" },
      { name: "Subjects", href: "/subjects", icon: FileText },
      { name: "Classrooms", href: "/classes", icon: DoorOpen },
    ],
  },

  { name: "Students List", href: "/students", icon: GraduationCap },
  { name: "Teachers", href: "/teachers", icon: Users },
  { name: "Grades", href: "/grades", icon: GraduationCap },
];

export const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  // Style variant state: 1 = Floating Glow, 2 = Left Capsule, 3 = Underline Glow
  const [activeStyle, setActiveStyle] = useState<1 | 2 | 3>(3);

  return (
    <div className="flex flex-col h-full w-full lg:w-[286px] border-r border-border bg-card/95 backdrop-blur-lg transition-colors duration-200">
      
      {/* --- Style Switcher Bar --- */}
      <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-purple-500" />
          <span>Nav Style:</span>
        </div>
        <div className="flex gap-1 bg-background/80 p-0.5 rounded-lg border border-border/80 shadow-xs">
          {[1, 2, 3].map((styleNum) => (
            <button
              key={styleNum}
              onClick={() => setActiveStyle(styleNum as 1 | 2 | 3)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer',
                activeStyle === styleNum
                  ? 'bg-purple-600 text-white shadow-xs scale-105'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              V{styleNum}
            </button>
          ))}
        </div>
      </div>

      {/* --- Main Navigation --- */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {mainNavigation.map((item) =>
          item.children ? (
            <SidebarParent
              key={item.name}
              item={item}
              location={location}
              styleVariant={activeStyle}
              onNavigate={onNavigate}
            />
          ) : (
            <SidebarLink
              key={item.name}
              item={item}
              location={location}
              styleVariant={activeStyle}
              onNavigate={onNavigate}
            />
          ),
        )}

        <LogoutConfirmDialog
          trigger={
            <button
              type="button"
              onClick={onNavigate}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-[7px] transition-colors duration-200 ease-in-out cursor-pointer",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <LogOut className="h-5 w-5" />
              <span className="truncate">Logout</span>
            </button>
          }
        />
      </nav>
    </div>
  );
};

/* ----------------------------------------
   DYNAMIC LINK COMPONENT (Supports 3 Styles)
---------------------------------------- */
const SidebarLink = ({ item, location, styleVariant, onNavigate }: any) => {
  const isActive = location.pathname === item.href;

  // Style 1: Enhanced Floating Glow
  const style1Class = isActive
    ? 'bg-gradient-to-r from-purple-500/15 via-purple-500/10 to-transparent text-[#5a30f1] dark:text-[#a259ff] font-semibold border border-purple-500/30 shadow-[0_0_15px_rgba(90,48,241,0.18)] backdrop-blur-md rounded-xl'
    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground font-medium rounded-xl';

  // Style 2: Enhanced Animated Left Capsule
  const style2Class = isActive
    ? 'bg-purple-500/10 text-[#5a30f1] dark:text-[#a259ff] font-semibold pl-5 rounded-lg'
    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground font-medium rounded-lg';

  // Style 3: Enhanced Underline Glow
  const style3Class = isActive
    ? 'bg-gradient-to-b from-purple-500/10 to-transparent text-[#5a30f1] dark:text-[#a259ff] font-bold rounded-t-lg'
    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground font-medium rounded-t-lg';

  const getContainerStyle = () => {
    if (styleVariant === 1) return style1Class;
    if (styleVariant === 2) return style2Class;
    return style3Class;
  };

  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      className={cn(
        'relative w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-all duration-300 ease-out group overflow-hidden',
        getContainerStyle()
      )}
    >
      {/* Style 2: Left Capsule Bar */}
      {styleVariant === 2 && (
        <span
          className={cn(
            'absolute left-1 top-2 bottom-2 w-1.5 rounded-full transition-all duration-300 ease-out',
            isActive
              ? 'bg-gradient-to-b from-[#5a30f1] to-[#a259ff] opacity-100 shadow-[0_0_10px_#5a30f1]'
              : 'bg-transparent opacity-0 group-hover:bg-muted-foreground/30 group-hover:opacity-100'
          )}
        />
      )}

      {/* Style 3: Bottom Gradient Line */}
      {styleVariant === 3 && (
        <span
          className={cn(
            'absolute bottom-0 left-2 right-2 h-[2.5px] rounded-full transition-all duration-300 ease-out',
            isActive
              ? 'bg-gradient-to-r from-[#5a30f1] via-[#7c3aed] to-[#a259ff] opacity-100 shadow-[0_2px_10px_rgba(90,48,241,0.6)]'
              : 'bg-transparent opacity-0 group-hover:bg-muted-foreground/20 group-hover:opacity-100'
          )}
        />
      )}

      <item.icon
        className={cn(
          'h-5 w-5 transition-all duration-300',
          isActive
            ? 'text-[#5a30f1] dark:text-[#a259ff] scale-110 drop-shadow-[0_0_6px_rgba(90,48,241,0.4)]'
            : 'text-muted-foreground group-hover:scale-105'
        )}
      />

      <span className="truncate">{item.name}</span>
      {/* Pulsing Active Indicator Dot */}
      {isActive && (
        <span className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5a30f1] dark:bg-[#a259ff] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#5a30f1] dark:bg-[#a259ff]" />
          </span>
          <ChevronRight className="h-4 w-4 text-[#5a30f1] dark:text-[#a259ff]" />
        </span>
      )}
    </Link>
  );
};

/* ----------------------------------------
   DYNAMIC PARENT COMPONENT (With Nested Links)
---------------------------------------- */
const SidebarParent = ({ item, location, styleVariant, onNavigate }: any) => {
  const isChildActive = item.children.some(
    (child: any) => location.pathname === child.href,
  );

  const [open, setOpen] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) {
      setOpen(true);
    }
  }, [isChildActive]);

  const style1Class = isChildActive
    ? 'bg-gradient-to-r from-purple-500/15 via-purple-500/10 to-transparent text-[#5a30f1] dark:text-[#a259ff] font-semibold border border-purple-500/30 rounded-xl'
    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground font-medium rounded-xl';

  const style2Class = isChildActive
    ? 'bg-purple-500/10 text-[#5a30f1] dark:text-[#a259ff] font-semibold pl-5 rounded-lg'
    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground font-medium rounded-lg';

  const style3Class = isChildActive
    ? 'bg-gradient-to-b from-purple-500/10 to-transparent text-[#5a30f1] dark:text-[#a259ff] font-bold rounded-t-lg'
    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground font-medium rounded-t-lg';

  const getContainerStyle = () => {
    if (styleVariant === 1) return style1Class;
    if (styleVariant === 2) return style2Class;
    return style3Class;
  };

  return (
    <div className="space-y-1">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-all duration-300 cursor-pointer group overflow-hidden',
          getContainerStyle()
        )}
      >
        {styleVariant === 2 && (
          <span
            className={cn(
              'absolute left-1 top-2 bottom-2 w-1.5 rounded-full transition-all duration-300 ease-out',
              isChildActive
                ? 'bg-gradient-to-b from-[#5a30f1] to-[#a259ff] opacity-100 shadow-[0_0_10px_#5a30f1]'
                : 'bg-transparent opacity-0 group-hover:bg-muted-foreground/30 group-hover:opacity-100'
            )}
          />
        )}

        {styleVariant === 3 && (
          <span
            className={cn(
              'absolute bottom-0 left-2 right-2 h-[2.5px] rounded-full transition-all duration-300 ease-out',
              isChildActive
                ? 'bg-gradient-to-r from-[#5a30f1] via-[#7c3aed] to-[#a259ff] opacity-100 shadow-[0_2px_10px_rgba(90,48,241,0.6)]'
                : 'bg-transparent opacity-0 group-hover:bg-muted-foreground/20 group-hover:opacity-100'
            )}
          />
        )}

        <item.icon
          className={cn(
            'h-5 w-5 transition-all duration-300',
            isChildActive
              ? 'text-[#5a30f1] dark:text-[#a259ff] scale-110 drop-shadow-[0_0_6px_rgba(90,48,241,0.4)]'
              : 'text-muted-foreground group-hover:scale-105'
          )}
        />
        <span className="truncate">{item.name}</span>

        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 transition-transform duration-300',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="ml-5 pl-3 border-l-2 border-purple-500/20 space-y-1 mt-1">
          {item.children.map((child: any) => {
            const isActive = location.pathname === child.href;
            return (
              <Link
                key={child.name}
                to={child.href}
                onClick={onNavigate}
                className={cn(
                  'relative flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200',
                  isActive
                    ? 'text-[#5a30f1] dark:text-[#a259ff] font-semibold bg-purple-500/15 dark:bg-purple-950/40 shadow-xs'
                    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground font-medium'
                )}
              >
                {isActive && (
                  <span className="absolute -left-[15px] top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[#5a30f1] dark:bg-[#a259ff] shadow-[0_0_8px_#5a30f1]" />
                )}
                <span className="truncate">{child.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
