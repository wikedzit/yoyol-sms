import {
  LayoutDashboard,
  Users,
  ChevronRight,
  ChevronDown,
  Building2,
  GraduationCap,
  LogOut,
  Puzzle,
  Palette,
  Inbox,
  ScrollText,
  Boxes,
  type LucideIcon,
} from "lucide-react";

import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";
import { useState, useEffect } from "react";
import { LogoutConfirmDialog } from "~/components/LogoutConfirmDialog";
import { useLanguage, type TranslationKey } from "~/lib/i18n";
import { modulesInTheMenu, shellMenu, type AppModule } from "workers/kernel/modules";
import { Separator } from "~/components/ui/separator";

type NavChild = { labelKey: TranslationKey; href: string };
type NavItem = {
  labelKey: TranslationKey;
  href?: string;
  icon: LucideIcon;
  children?: NavChild[];
};

const moduleIcons: Record<string, LucideIcon> = {
  academics: Building2,
  school: Building2,
  access: Users,
  students: GraduationCap,
  staff: Users,
  assessment: GraduationCap,
};

const shellIcons: Record<string, LucideIcon> = {
  "/inbox": Inbox,
  "/audit": ScrollText,
  "/modules": Boxes,
  "/plugins": Puzzle,
  "/themes": Palette,
};

function navigationFor(module: AppModule): NavItem {
  const icon = moduleIcons[module.key] ?? LayoutDashboard;
  if (module.menu.length === 1) {
    return {
      labelKey: module.menu[0].labelKey as TranslationKey,
      href: module.menu[0].path,
      icon,
    };
  }

  return {
    labelKey: module.menuLabelKey as TranslationKey,
    icon,
    children: module.menu.map((item) => ({
      labelKey: item.labelKey as TranslationKey,
      href: item.path,
    })),
  };
}

const schoolNavigation: NavItem[] = [
  { labelKey: "dashboard", href: "/", icon: LayoutDashboard },
  ...modulesInTheMenu("school").map(navigationFor),
];

const systemNavigation: NavItem[] = [
  ...modulesInTheMenu("system").map(navigationFor),
  ...shellMenu.map((item) => ({
    labelKey: item.labelKey as TranslationKey,
    href: item.path,
    icon: shellIcons[item.path] ?? Puzzle,
  })),
];

export const SidebarContent = ({
  onNavigate,
  extraLinks = [],
}: {
  onNavigate?: () => void;
  extraLinks?: { href: string; labelEn: string; labelSw: string }[];
}) => {
  const location = useLocation();
  const { t, language } = useLanguage();

  return (
    <div className="flex flex-col h-full w-full lg:w-[286px] border-r border-border bg-card/95 backdrop-blur-lg transition-colors duration-200">
      {/* Main Navigation List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {schoolNavigation.map((item) =>
          item.children ? (
            <SidebarParent
              key={item.labelKey}
              item={item}
              location={location}
              onNavigate={onNavigate}
            />
          ) : (
            <SidebarLink
              key={item.labelKey}
              item={item}
              location={location}
              onNavigate={onNavigate}
            />
          ),
        )}

        {extraLinks.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            onClick={onNavigate}
            className={cn(
              "relative w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-[8px] transition-all duration-200 ease-out",
              location.pathname === link.href
                ? "bg-primary-gradient text-white font-semibold"
                : "text-app-body hover:bg-accent hover:text-app-text",
            )}
          >
            <Puzzle className="h-5 w-5" />
            <span className="truncate">{language === "sw" ? link.labelSw : link.labelEn}</span>
          </Link>
        ))}

        <Separator className="my-3" />

        {systemNavigation.map((item) =>
          item.children ? (
            <SidebarParent
              key={item.labelKey}
              item={item}
              location={location}
              onNavigate={onNavigate}
            />
          ) : (
            <SidebarLink
              key={item.labelKey}
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
const SidebarLink = ({
  item,
  location,
  onNavigate,
}: {
  item: NavItem;
  location: ReturnType<typeof useLocation>;
  onNavigate?: () => void;
}) => {
  const { t } = useLanguage();
  const isActive = location.pathname === item.href;

  return (
      <Link
      to={item.href ?? "/"}
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

      <span className="truncate">{t(item.labelKey)}</span>

      {/* Subtle indicator icon for active route */}
      {isActive && <ChevronRight className="ml-auto h-4 w-4 text-white" />}
    </Link>
  );
};

/* ----------------------------------------
   SINGLE STREAMLINED PARENT COMPONENT
---------------------------------------- */
const SidebarParent = ({
  item,
  location,
  onNavigate,
}: {
  item: NavItem;
  location: ReturnType<typeof useLocation>;
  onNavigate?: () => void;
}) => {
  const { t } = useLanguage();
  const children = item.children ?? [];
  const isChildActive = children.some((child) => location.pathname === child.href);

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
        <span className="truncate">{t(item.labelKey)}</span>

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
          {children.map((child) => {
            const isActive = location.pathname === child.href;
            return (
              <Link
                key={child.href}
                to={child.href}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center px-3 py-2 text-sm rounded-[8px] transition-all duration-200",
                  isActive
                    ? "bg-primary-gradient text-white font-semibold shadow-md shadow-[#5a30f1]/25 border border-white/10 opacity-100"
                    : "text-app-body hover:bg-accent hover:text-app-text font-medium",
                )}
              >
                <span className="truncate">{t(child.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
