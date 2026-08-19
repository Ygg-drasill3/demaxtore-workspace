import { Link } from "react-router-dom";
import { PackageSearch, Ship, ShieldCheck, AlertCircle, Truck, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommandCenterKpis } from "../../lib/buyer-command-center";
import type { TradeTimelineKpiDto } from "@dmx/contracts/trade-timeline";
import { useT } from "@/i18n/useT";

/** Sprint 43 — import-execution KPIs (real data only; — when unknown). */
export interface ImportExecutionKpis extends CommandCenterKpis {
  customsActive?: number;
  deliveriesActive?: number;
}

const KPIS = [
  { key: "activeImports" as const, labelKey: "s43.kpi.activeImports", fallback: "Active imports", to: "/buyer/imports", icon: PackageSearch, testId: "cc-kpi-active-imports", tone: "accent", fromTimeline: "activeTrades" as const },
  { key: "shipmentsInTransit" as const, labelKey: "s43.kpi.inTransit", fallback: "In transit", to: "/buyer/shipments", icon: Ship, testId: "cc-kpi-in-transit", tone: "violet" },
  { key: "customsActive" as const, labelKey: "s43.kpi.inCustoms", fallback: "In customs", to: "/buyer/customs", icon: ShieldCheck, testId: "cc-kpi-in-customs", tone: "blue" },
  { key: "pendingActions" as const, labelKey: "s43.kpi.actionRequired", fallback: "Action required", to: "/exceptions", icon: AlertCircle, testId: "cc-kpi-action-required", tone: "amber" },
  { key: "deliveriesActive" as const, labelKey: "s43.kpi.inDelivery", fallback: "In delivery", to: "/buyer/inland", icon: Truck, testId: "cc-kpi-in-delivery", tone: "emerald" },
  { key: "bookingsPending" as const, labelKey: "s43.kpi.freightPending", fallback: "Freight pending", to: "/buyer/freightiq", icon: Receipt, testId: "cc-kpi-freight-pending", tone: "rose" },
] as const;

const TONE_STYLES = {
  accent:  { icon: "bg-accent-50 text-accent-900",   ring: "hover:ring-accent-900/15" },
  emerald: { icon: "bg-emerald-50 text-emerald-800", ring: "hover:ring-emerald-500/20" },
  amber:   { icon: "bg-amber-50 text-amber-800",     ring: "hover:ring-amber-500/20" },
  blue:    { icon: "bg-blue-50 text-blue-800",       ring: "hover:ring-blue-500/20" },
  violet:  { icon: "bg-violet-50 text-violet-800",   ring: "hover:ring-violet-500/20" },
  rose:    { icon: "bg-rose-50 text-rose-800",       ring: "hover:ring-rose-500/20" },
};

export function ImportExecutionKpiRow({
  kpis,
  timelineKpis,
  loading,
  max,
}: {
  kpis?: ImportExecutionKpis;
  timelineKpis?: TradeTimelineKpiDto;
  loading?: boolean;
  /** Turkey command center shows the 5 primary KPIs (spec §7). */
  max?: number;
}) {
  const { t } = useT();

  const resolveValue = (key: typeof KPIS[number]["key"]): number | null => {
    if (loading) return null;
    if (key === "activeImports") return timelineKpis?.activeTrades ?? kpis?.activeOrders ?? null;
    if (key === "customsActive") return kpis?.customsActive ?? null;
    if (key === "deliveriesActive") return kpis?.deliveriesActive ?? null;
    const v = kpis?.[key as keyof CommandCenterKpis];
    return typeof v === "number" ? v : null;
  };

  const visibleKpis = typeof max === "number" ? KPIS.slice(0, max) : KPIS;

  return (
    <section
      data-testid="cc-import-kpi-row"
      data-guide="dashboard-import-kpis"
      className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3"
    >
      {visibleKpis.map(({ key, labelKey, fallback, to, icon: Icon, testId, tone }) => {
        const raw = resolveValue(key);
        const display = loading || raw === null ? "—" : raw;
        const hasValue = !loading && raw !== null && raw > 0;
        const styles = TONE_STYLES[tone];

        return (
          <Link
            key={key}
            to={to}
            data-testid={testId}
            className={cn(
              "group dmx-card dmx-card-hover p-4 flex flex-col gap-3 min-h-[96px] ring-1 ring-transparent transition-all",
              styles.ring,
              hasValue && "border-paper-200",
            )}
          >
            <div className={cn("h-9 w-9 rounded-xl grid place-items-center shrink-0 transition-transform group-hover:scale-105", styles.icon)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-2xl font-semibold tabular-nums leading-none">
                {display}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1.5 truncate">
                {t(labelKey, fallback)}
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
