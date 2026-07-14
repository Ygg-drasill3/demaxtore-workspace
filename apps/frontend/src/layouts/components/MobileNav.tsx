// apps/frontend/src/layouts/components/MobileNav.tsx
import { useEffect } from "react";
import { redirectToLogin } from "@/lib/login-redirect";
import { LogOut, X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { useAuth } from "@/store/auth.store";
import { useUi } from "@/store/ui.store";
import { NAV_GROUPS_BY_ROLE } from "@/routes/navigation";
import { translateNavGroups } from "@/i18n/translateNav";
import { useT } from "@/i18n/useT";
import { NavMenu } from "./NavMenu";
import { useNavBadges } from "@/layouts/hooks/useNavBadges";
import { leftDrawerPanelVariants, modalBackdropVariants, reducedVariants } from "@/motion/tokens";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";

export function MobileNav() {
  const role = useAuth((s) => s.user?.role);
  const logout = useAuth((s) => s.logout);
  const open = useUi((s) => s.mobileMenuOpen);
  const closeMobileMenu = useUi((s) => s.closeMobileMenu);
  const { t } = useT();
  const badges = useNavBadges();
  const reduced = useReducedMotion();
  const backdropV = reduced ? reducedVariants : modalBackdropVariants;
  const panelV = reduced ? reducedVariants : leftDrawerPanelVariants;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeMobileMenu(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeMobileMenu]);

  if (!role) return null;

  const groups = translateNavGroups(NAV_GROUPS_BY_ROLE[role] ?? [], t);

  return (
    <AnimatePresence>
      {open && (
        <div data-testid="mobile-nav" className="lg:hidden fixed inset-0 z-40">
          <m.button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={closeMobileMenu}
            variants={backdropV}
            initial="hidden"
            animate="visible"
            exit="exit"
          />
          <m.aside
            className="absolute inset-y-0 left-0 flex w-[min(300px,88vw)] flex-col overflow-hidden border-r border-white/[0.06] bg-gradient-to-b from-ink-950 via-[#0c1018] to-[#080b12] text-zinc-300 shadow-2xl dmx-motion-gpu"
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
              <div className="flex items-center gap-3">
                <div className="relative grid h-9 w-9 place-items-center rounded-[10px] bg-white font-display text-sm font-bold text-ink-950 shadow-sm">
                  D
                </div>
                <div>
                  <span className="block font-display text-[15px] font-semibold leading-tight text-white">
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav
              aria-label="Main navigation"
              data-lenis-prevent
              className="dmx-sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-2"
            >
              <NavMenu groups={groups} collapsed={false} badges={badges} onNavigate={closeMobileMenu} />
            </nav>

            <div className="shrink-0 border-t border-white/[0.06] px-3 py-3">
              <button
                type="button"
                data-testid="mobile-nav-logout"
                onClick={async () => {
                  closeMobileMenu();
                  await logout();
                  redirectToLogin();
                }}
                className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-white/5"
              >
                <LogOut className="h-4 w-4" />
                {t("common.signOut")}
              </button>
            </div>
          </m.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
