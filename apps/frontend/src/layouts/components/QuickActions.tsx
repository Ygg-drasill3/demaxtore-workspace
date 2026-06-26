import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { QuickAction } from "@/routes/navigation";
import { useT } from "@/i18n/useT";

const FEATURED_IDS = new Set(["qa-new-rfq", "qa-create-cb"]);

export function QuickActions({ actions, collapsed }: { actions: QuickAction[]; collapsed: boolean }) {
  const { t } = useT();
  if (!actions.length) return null;

  if (collapsed) {
    return (
      <div data-testid="nav-quick-actions" className="px-2 py-2 space-y-1 border-b border-white/[0.06]">
        {actions.slice(0, 4).map((a) => {
          const Icon = a.icon;
          const featured = FEATURED_IDS.has(a.testId);
          return (
            <Link
              key={a.testId}
              to={a.to}
              data-testid={a.testId}
              title={a.label}
              className={cn(
                "flex h-9 w-full items-center justify-center rounded-lg transition-all duration-200",
                featured
                  ? "bg-accent-900/90 text-white shadow-sm shadow-accent-900/30 hover:bg-accent-600"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
            </Link>
          );
        })}
      </div>
    );
  }

  const featured = actions.filter((a) => FEATURED_IDS.has(a.testId));
  const secondary = actions.filter((a) => !FEATURED_IDS.has(a.testId));

  return (
    <div data-testid="nav-quick-actions" className="px-3 pt-3 pb-2">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-2.5 flex items-center gap-2 px-1">
          <span className="h-1 w-1 rounded-full bg-accent-500/80" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {t("common.quickActions")}
          </span>
        </div>

        <div className="space-y-1.5">
          {featured.map((a) => {
            const Icon = a.icon;
            const isCreate = a.testId === "qa-create-cb";
            return (
              <NavLink
                key={a.testId}
                to={a.to}
                data-testid={a.testId}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
                    isCreate
                      ? isActive
                        ? "bg-gradient-to-r from-accent-900 to-accent-600 text-white shadow-lg shadow-accent-900/35 ring-1 ring-white/20"
                        : "bg-gradient-to-r from-accent-900 to-accent-600 text-white shadow-md shadow-accent-900/25 hover:shadow-lg hover:shadow-accent-900/30 hover:brightness-105"
                      : isActive
                        ? "bg-white/12 text-white ring-1 ring-white/10"
                        : "bg-white/[0.06] text-zinc-100 hover:bg-white/[0.1]",
                  )
                }
              >
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors",
                    isCreate ? "bg-white/15" : "bg-white/[0.08] group-hover:bg-white/[0.12]",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="truncate">{a.label}</span>
              </NavLink>
            );
          })}
        </div>

        {secondary.length > 0 && (
          <>
            <div className="my-2.5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="grid grid-cols-2 gap-1">
              {secondary.map((a) => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.testId}
                    to={a.to}
                    data-testid={a.testId}
                    className="group flex flex-col gap-1 rounded-lg px-2 py-2 text-[11px] text-zinc-400 transition-all duration-200 hover:bg-white/[0.05] hover:text-zinc-100"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-white/[0.04] text-zinc-500 transition-colors group-hover:bg-white/[0.08] group-hover:text-white">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="leading-tight line-clamp-2">{a.label}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
