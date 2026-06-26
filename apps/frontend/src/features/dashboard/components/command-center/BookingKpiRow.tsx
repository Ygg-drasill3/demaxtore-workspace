import { Link } from "react-router-dom";
import { Anchor, AlertTriangle, RefreshCw, CheckCircle, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommandCenterKpis } from "../../lib/buyer-command-center";

const BOOKING_KPIS = [
  { key: "bookingsPending" as const, label: "Bookings Pending", icon: Anchor, testId: "cc-kpi-bookings-pending", tone: "amber" },
  { key: "bookingsConfirmed" as const, label: "Bookings Confirmed", icon: CheckCircle, testId: "cc-kpi-bookings-confirmed", tone: "emerald" },
  { key: "cutoffRisks" as const, label: "Cut-Off Risks", icon: AlertTriangle, testId: "cc-kpi-cutoff-risks", tone: "rose" },
  { key: "forecastChanges" as const, label: "Forecast Changes", icon: CalendarClock, testId: "cc-kpi-forecast-changes", tone: "blue" },
  { key: "rebookRequired" as const, label: "Rebook Required", icon: RefreshCw, testId: "cc-kpi-rebook-required", tone: "violet" },
] as const;

const TONE_STYLES = {
  amber: { icon: "bg-amber-50 text-amber-800", ring: "hover:ring-amber-500/20" },
  emerald: { icon: "bg-emerald-50 text-emerald-800", ring: "hover:ring-emerald-500/20" },
  rose: { icon: "bg-rose-50 text-rose-800", ring: "hover:ring-rose-500/20" },
  blue: { icon: "bg-blue-50 text-blue-800", ring: "hover:ring-blue-500/20" },
  violet: { icon: "bg-violet-50 text-violet-800", ring: "hover:ring-violet-500/20" },
};

export function BookingKpiRow({ kpis, loading }: { kpis?: CommandCenterKpis; loading?: boolean }) {
  return (
    <section data-testid="cc-booking-kpi-row" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      {BOOKING_KPIS.map(({ key, label, icon: Icon, testId, tone }) => {
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
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-1.5 truncate">{label}</div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
