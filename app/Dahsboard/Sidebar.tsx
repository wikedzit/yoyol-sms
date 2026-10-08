import { SidebarContent } from "./SidebarContent";

// ============================================================================
// Added theme classes (bg-card, text-card-foreground, border-border)
// to ensure the desktop sidebar wrapper adapts to Light and Dark modes seamlessly.
// ============================================================================
export type SidebarLinkItem = { href: string; labelEn: string; labelSw: string };

export default function AppSidebar({ extraLinks = [] }: { extraLinks?: SidebarLinkItem[] }) {
  return (
    <aside className="h-full w-full bg-card text-card-foreground border-r border-border flex flex-col transition-colors duration-200">
      <SidebarContent extraLinks={extraLinks} />
    </aside>
  );
}
