// apps/frontend/src/layouts/components/UserMenu.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/store/auth.store";
import { initials } from "@/lib/utils";
import { ROLE_DASHBOARD } from "@dmx/contracts/auth";
import { useT } from "@/i18n/useT";

export function UserMenu() {
  const user   = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const nav    = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const { t } = useT();
  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-1.5 pl-1 rounded-lg inline-flex items-center gap-2 hover:bg-paper-100 dmx-focus-ring"
      >
        <div className="h-7 w-7 rounded-full bg-ink-950 text-white grid place-items-center text-[11px] font-semibold">
          {initials(user.displayName)}
        </div>
        <div className="hidden md:flex flex-col items-start leading-tight">
          <span className="text-xs font-medium text-ink-900 truncate max-w-[120px]">{user.displayName}</span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">{t(`role.${user.role}`)}</span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
      </button>

      {open && (
        <div
          data-testid="user-menu-dropdown"
          role="menu"
          className="absolute right-0 mt-1 w-60 bg-white border border-paper-200 rounded-xl shadow-modal py-1.5 animate-slide-in z-40"
        >
          <div className="px-3 py-2.5 border-b border-paper-200">
            <div className="text-sm font-medium text-ink-900 truncate">{user.displayName}</div>
            <div className="text-xs text-zinc-500 truncate">{user.email}</div>
          </div>
          <button
            onClick={() => { setOpen(false); nav(ROLE_DASHBOARD[user.role]); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-paper-50 inline-flex items-center gap-2"
          >
            <UserIcon className="h-3.5 w-3.5 text-zinc-500" /> {t("common.myDashboard")}
          </button>
          <button
            data-testid="user-menu-logout"
            onClick={async () => { setOpen(false); await logout(); nav("/login"); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-paper-50 inline-flex items-center gap-2 text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" /> {t("common.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
