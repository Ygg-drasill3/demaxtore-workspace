// apps/frontend/src/layouts/components/MobileNav.tsx
import { useNavigate } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import { useAuth } from "@/store/auth.store";
import { useUi } from "@/store/ui.store";
import { NAV_GROUPS_BY_ROLE, QUICK_ACTIONS_BY_ROLE } from "@/routes/navigation";
import { translateNavGroups, translateQuickActions } from "@/i18n/translateNav";
import { useT } from "@/i18n/useT";
import { NavMenu } from "./NavMenu";
import { QuickActions } from "./QuickActions";

export function MobileNav() {
  const role = useAuth((s) => s.user?.role);
  const logout = useAuth((s) => s.logout);
  const open = useUi((s) => s.mobileMenuOpen);
  const closeMobileMenu = useUi((s) => s.closeMobileMenu);
  const nav = useNavigate();
  const { t } = useT();

  if (!role || !open) return null;

  const groups = translateNavGroups(NAV_GROUPS_BY_ROLE[role] ?? [], t);
  const quickActions = translateQuickActions(QUICK_ACTIONS_BY_ROLE[role] ?? [], t);

  return (
    <div data-testid="mobile-nav" className="lg:hidden fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/40"
        onClick={closeMobileMenu}
      />
      <aside className="absolute inset-y-0 left-0 w-[min(300px,88vw)] flex flex-col bg-gradient-to-b from-ink-950 via-[#0c1018] to-[#080b12] text-zinc-300 shadow-2xl border-r border-white/[0.06]">
        <div className="h-[4.25rem] flex items-center justify-between px-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 rounded-[10px] bg-white text-ink-950 grid place-items-center font-display font-bold text-sm shadow-sm">
              D
            </div>
            <div>
              <span className="font-display text-[15px] font-semibold text-white block leading-tight">
                DeMaxtore
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                Trade OS
              </span>
            </div>
          </div>
          <button
            type="button"
            data-testid="mobile-nav-close"
            aria-label="Close menu"
            onClick={closeMobileMenu}
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {quickActions.length > 0 && <QuickActions actions={quickActions} collapsed={false} />}

        <nav className="flex-1 px-2 py-4 overflow-y-auto dmx-thin-scroll">
          <NavMenu groups={groups} collapsed={false} onNavigate={closeMobileMenu} />
        </nav>

        <div className="px-3 py-3 border-t border-white/[0.06]">
          <button
            type="button"
            data-testid="mobile-nav-logout"
            onClick={async () => {
              closeMobileMenu();
              await logout();
              nav("/login");
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/5 rounded-lg inline-flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t("common.signOut")}
          </button>
        </div>
      </aside>
    </div>
  );
}
