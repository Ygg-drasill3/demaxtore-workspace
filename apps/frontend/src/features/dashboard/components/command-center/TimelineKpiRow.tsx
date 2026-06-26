import { Link } from "react-router-dom";
import { Activity, Factory, Ship, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradeTimelineKpiDto } from "@dmx/contracts/trade-timeline";
import { useT } from "@/i18n/useT";

const TIMELINE_KPIS = [
  { key: "activeTrades" as const, labelKey: "dash.kpi.activeTrades", fallback: "Active Trades", icon: Activity, testId: "cc-kpi-active-trades", tone: "accent" },
  { key: "tradesInProduction" as const, labelKey: "dash.kpi.inProduction", fallback: "In Production", icon: Factory, testId: "cc-kpi-trades-production", tone: "blue" },
  { key: "tradesInTransit" as const, labelKey: "dash.kpi.tradesInTransit", fallback: "Trades in transit", icon: Ship, testId: "cc-kpi-trades-transit", tone: "violet" },
  { key: "delayedTrades" as const, labelKey: "dash.kpi.delayed", fallback: "Delayed", icon: AlertTriangle, testId: "cc-kpi-trades-delayed", tone: "rose" },
  { key: "completedTrades" as const, labelKey: "dash.kpi.completed", fallback: "Completed", icon: CheckCircle2, testId: "cc-kpi-trades-completed", tone: "emerald" },
] as const;

const TONE_STYLES = {
  accent: { icon: "bg-accent-50 text-accent-900", ring: "hover:ring-accent-900/15" },
  blue: { icon: "bg-blue-50 text-blue-800", ring: "hover:ring-blue-500/20" },
  violet: { icon: "bg-violet-50 text-violet-800", ring: "hover:ring-violet-500/20" },
  rose: { icon: "bg-rose-50 text-rose-800", ring: "hover:ring-rose-500/20" },
  emerald: { icon: "bg-emerald-50 text-emerald-800", ring: "hover:ring-emerald-500/20" },
};

export function TimelineKpiRow({ kpis, loading }: { kpis?: TradeTimelineKpiDto; loading?: boolean }) {
  const { t } = useT();
  return (
    <section data-testid="cc-timeline-kpi-row" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      {TIMELINE_KPIS.map(({ key, labelKey, fallback, icon: Icon, testId, tone }) => {
        const value = loading ? "—" : (kpis?.[key] ?? 0);
        const hasValue = !loading && (kpis?.[key] ?? 0) > 0;
        const styles = TONE_STYLES[tone];

        return (
          <Link
            key={key}
            to="/buyer/rfq"
            data-testid={testId}
            className={cn(
              "group dmx-card dmx-card-hover p-4 flex flex-col gap-3 min-h-[96px] ring-1 ring-transparent transition-all",
              styles.ring,
              hasValue && "border-paper-200",
            )}
          >
            <div className={cn("h-9 w-9 rounded-xl grid place-items-center shrink-0", styles.icon)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-2xl font-semibold tabular-nums leading-none">{value}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1.5 truncate">{t(labelKey, fallback)}</div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
