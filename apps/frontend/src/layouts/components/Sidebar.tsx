// apps/frontend/src/layouts/components/Sidebar.tsx
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth.store";
import { useUi } from "@/store/ui.store";
import { NAV_GROUPS_BY_ROLE, QUICK_ACTIONS_BY_ROLE } from "@/routes/navigation";
import { translateNavGroups, translateQuickActions } from "@/i18n/translateNav";
import { useT } from "@/i18n/useT";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { NavMenu } from "./NavMenu";
import { QuickActions } from "./QuickActions";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

export function Sidebar() {
  const role  = useAuth((s) => s.user?.role);
  const collapsed     = useUi((s) => s.sidebarCollapsed);
  const toggleSidebar = useUi((s) => s.toggleSidebar);

  const { t } = useT();
  if (!role) return null;
  const groups = translateNavGroups(NAV_GROUPS_BY_ROLE[role] ?? [], t);
  const quickActions = translateQuickActions(QUICK_ACTIONS_BY_ROLE[role] ?? [], t);

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        "hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col",
        "bg-gradient-to-b from-ink-950 via-[#0c1018] to-[#080b12]",
        "border-r border-white/[0.06] shadow-[4px_0_32px_rgba(0,0,0,0.18)]",
        "transition-[width] duration-300 ease-out",
        collapsed ? "w-[68px]" : "w-[260px]",
      )}
    >
      <div className="relative h-[4.25rem] flex items-center gap-3 px-4 border-b border-white/[0.06] shrink-0">
        <div className="relative shrink-0">
          <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-white/20 to-white/5 opacity-60" />
          <div className="relative h-9 w-9 rounded-[10px] bg-white text-ink-950 grid place-items-center font-display font-bold text-sm shadow-sm">
            D
          </div>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-display text-[15px] font-semibold tracking-tight text-white leading-tight">
              DeMaxtore
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500 mt-0.5">
              Trade OS
            </div>
          </div>
        )}
      </div>

      {quickActions.length > 0 && <QuickActions actions={quickActions} collapsed={collapsed} />}

      <nav className="flex-1 px-2.5 py-3 overflow-y-auto dmx-thin-scroll">
        <NavMenu groups={groups} collapsed={collapsed} />
      </nav>

      <div className="px-2.5 py-3 border-t border-white/[0.06] space-y-2">
        {!collapsed && (
          <div className="flex justify-center">
            <LanguageSwitcher variant="dark" />
          </div>
        )}
        <button
          data-testid="sidebar-collapse"
          onClick={toggleSidebar}
          className={cn(
            "w-full h-9 inline-flex items-center justify-center gap-2 rounded-lg",
            "text-[11px] font-medium text-zinc-500",
            "hover:text-zinc-200 hover:bg-white/[0.05] transition-all duration-200",
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span>{t("common.collapse")}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
