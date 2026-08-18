// apps/frontend/src/layouts/components/Sidebar.tsx
import { PanelLeftClose } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { useAuth } from "@/store/auth.store";
import { useUi } from "@/store/ui.store";
import { navGroupsForRole } from "@/routes/navigation";
import { translateNavGroups } from "@/i18n/translateNav";
import { useT } from "@/i18n/useT";
import { NavMenu } from "./NavMenu";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useNavBadges } from "@/layouts/hooks/useNavBadges";
import { sidebarWidth } from "@/layouts/sidebar.constants";
import { springSnappy } from "@/motion/tokens";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";

export function Sidebar() {
  const role = useAuth((s) => s.user?.role);
  const buyerOperatingModel = useAuth((s) => s.user?.buyerOperatingModel);
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const { t } = useT();
  const badges = useNavBadges();
  const reduced = useReducedMotion();
  const width = sidebarWidth(collapsed);

  if (!role) return null;
  const groups = translateNavGroups(navGroupsForRole(role, buyerOperatingModel), t);

  return (
    <m.aside
      data-testid="sidebar"
      data-collapsed={collapsed || undefined}
      initial={false}
      animate={{ width }}
      transition={reduced ? { duration: 0 } : springSnappy}
      className={cn(
        "hidden lg:flex fixed inset-y-0 left-0 z-30 h-screen max-h-screen min-h-0 flex-col overflow-hidden",
        "bg-gradient-to-b from-ink-950 via-[#0c1018] to-[#080b12]",
        "border-r border-white/[0.06] shadow-[4px_0_32px_rgba(0,0,0,0.18)] dmx-motion-gpu",
      )}
    >
      <div className="relative flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] px-3">
        <AnimatePresence initial={false} mode="wait">
          {collapsed ? (
            <m.div
              key="logo-compact"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.15 }}
              className="flex w-full items-center justify-center overflow-hidden"
            >
              <BrandLogo compact />
            </m.div>
          ) : (
            <m.div
              key="logo-full"
              initial={reduced ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? undefined : { opacity: 0, x: -8 }}
              transition={reduced ? { duration: 0 } : springSnappy}
              className="min-w-0 overflow-hidden"
            >
              <BrandLogo />
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <nav
          aria-label="Main navigation"
          data-lenis-prevent
          data-testid="sidebar-nav-scroll"
          className="dmx-sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-2"
        >
          <NavMenu groups={groups} collapsed={collapsed} badges={badges} />
        </nav>
      </div>

      <div className="shrink-0 space-y-1.5 border-t border-white/[0.06] px-2 py-2">
        {!collapsed && (
          <div className="flex justify-center">
            <LanguageSwitcher variant="dark" />
          </div>
        )}
        <button
          type="button"
          data-testid="sidebar-collapse-toggle"
          onClick={toggleSidebar}
          aria-label={collapsed ? t("common.expand") : t("common.collapse")}
          className={cn(
            "flex h-9 w-full items-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white",
            collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
          )}
        >
          <m.span
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={reduced ? { duration: 0 } : springSnappy}
            className="grid h-7 w-7 shrink-0 place-items-center"
          >
            <PanelLeftClose className="h-4 w-4" />
          </m.span>
          {!collapsed && (
            <span className="truncate text-[13px] font-medium">{t("common.collapse")}</span>
          )}
        </button>
      </div>
    </m.aside>
  );
}
