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
} from "lucide-react";

import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";
import { useState, useEffect } from "react";
import { LogoutConfirmDialog } from "~/components/LogoutConfirmDialog";
import { useLanguage } from "~/lib/i18n";

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
      { name: "Members", href: "/schools/members", labelKey: "schoolMembers" },
      { name: "Roles", href: "/schools/roles", labelKey: "schoolRoles" },
      { name: "Extensions", href: "/extensions", labelKey: "installExtensions" },
      { name: "Themes", href: "/themes", labelKey: "installThemes" },
    ],
  },

  { name: "Students List", href: "/students", icon: GraduationCap },
  { name: "Teachers", href: "/teachers", icon: Users },
  { name: "Grades", href: "/grades", icon: GraduationCap },
];

export const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-full w-full lg:w-[286px] border-r border-border bg-card/95 backdrop-blur-lg transition-colors duration-200">
      {/* Main Navigation List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
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
          ),
        )}

        {/* Logout trigger button */}
        <LogoutConfirmDialog
          trigger={
            <button
              type="button"
              onClick={onNavigate}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ease-in-out cursor-pointer",
                "text-app-body hover:bg-accent hover:text-app-text",
              )}
            >
              <LogOut className="h-5 w-5" />
              <span className="truncate">{t("logout")}</span>
            </button>
          }
        />
      </nav>
    </div>
  );
};

/* ----------------------------------------
   SINGLE STREAMLINED SIDEBAR LINK
---------------------------------------- */
const SidebarLink = ({ item, location, onNavigate }: any) => {
  const isActive = location.pathname === item.href;

  return (
    <Link
      to={item.href}
      onClick={onNavigate}
      className={cn(
        "relative w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-[8px] transition-all duration-200 ease-out group",
        isActive
          ? "bg-primary-gradient text-white font-semibold shadow-md shadow-[#5a30f1]/25 border border-white/10 opacity-100"
          : "text-app-body hover:bg-accent hover:text-app-text",
      )}
    >
      <item.icon
        className={cn(
          "h-5 w-5 transition-transform duration-200",
          isActive
            ? "text-white scale-105"
            : "text-app-body group-hover:scale-105",
        )}
      />

      <span className="truncate">{item.name}</span>

      {/* Subtle indicator icon for active route */}
      {isActive && <ChevronRight className="ml-auto h-4 w-4 text-white" />}
    </Link>
  );
};

/* ----------------------------------------
   SINGLE STREAMLINED PARENT COMPONENT
---------------------------------------- */
const SidebarParent = ({ item, location, onNavigate }: any) => {
  const { t } = useLanguage();
  const isChildActive = item.children.some(
    (child: any) => location.pathname === child.href,
  );

  const [open, setOpen] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) {
      setOpen(true);
    }
  }, [isChildActive]);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-[8px] transition-all duration-200 cursor-pointer group",
          isChildActive
            ? "bg-primary-gradient text-white font-semibold shadow-md shadow-[#5a30f1]/25 border border-white/10 opacity-100"
            : "text-app-body hover:bg-accent hover:text-app-text",
        )}
      >
        <item.icon
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            isChildActive
              ? "text-white scale-105"
              : "text-app-body group-hover:scale-105",
          )}
        />
        <span className="truncate">{item.name}</span>

        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 transition-transform duration-200",
            isChildActive ? "text-white" : "text-app-body",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Nested Sub-navigation */}
      {open && (
        <div className="ml-5 pl-3 border-l border-border space-y-1 mt-1">
          {item.children.map((child: any) => {
            const isActive = location.pathname === child.href;
            return (
              <Link
                key={child.name}
                to={child.href}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center px-3 py-2 text-sm rounded-[8px] transition-all duration-200",
                  isActive
                    ? "bg-primary-gradient text-white font-semibold shadow-md shadow-[#5a30f1]/25 border border-white/10 opacity-100"
                    : "text-app-body hover:bg-accent hover:text-app-text font-medium",
                )}
              >
                <span className="truncate">
                  {child.labelKey ? t(child.labelKey) : child.name}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
