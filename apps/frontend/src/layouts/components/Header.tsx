// apps/frontend/src/layouts/components/Header.tsx
import { useLocation, Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { useMemo } from "react";
import { useUi } from "@/store/ui.store";
import { useT } from "@/i18n/useT";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";

export function Header() {
  const { pathname } = useLocation();
  const openMobileMenu = useUi((s) => s.openMobileMenu);
  const { t } = useT();

  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((segment, idx) => ({
      label: t(`crumb.${segment}`, segment),
      to:    "/" + parts.slice(0, idx + 1).join("/"),
      isLast: idx === parts.length - 1,
    }));
  }, [pathname, t]);

  return (
    <header data-testid="app-header" className="h-16 px-5 sm:px-8 bg-white/90 backdrop-blur border-b border-paper-200 flex items-center justify-between gap-4 sticky top-0 z-20">
      <button
        type="button"
        data-testid="mobile-nav-open"
        aria-label={t("common.openMenu")}
        onClick={openMobileMenu}
        className="lg:hidden h-10 w-10 inline-flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
      >
        <Menu className="h-5 w-5" />
      </button>
      <nav aria-label="Breadcrumb" className="text-sm min-w-0 truncate flex-1">
        <ol className="flex items-center gap-1.5 text-zinc-500">
          {crumbs.map((c, i) => (
            <li key={c.to} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-zinc-300">/</span>}
              {c.isLast ? (
                <span className="text-ink-900 font-medium">{c.label}</span>
              ) : (
                <Link to={c.to} className="hover:text-ink-900">{c.label}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
