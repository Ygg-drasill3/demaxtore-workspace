import { Anchor, AlertTriangle, RefreshCw, CheckCircle, CalendarClock } from "lucide-react";
import type { CommandCenterKpis } from "../../lib/buyer-command-center";
import { KpiTileGrid, type KpiTileSpec, type KpiTone } from "./KpiTileGrid";

const BOOKING_KPIS = [
  { key: "bookingsPending", label: "Pending bookings", icon: Anchor, testId: "cc-kpi-bookings-pending", tone: "amber" },
  { key: "bookingsConfirmed", label: "Confirmed bookings", icon: CheckCircle, testId: "cc-kpi-bookings-confirmed", tone: "emerald" },
  { key: "cutoffRisks", label: "Cut-off risks", icon: AlertTriangle, testId: "cc-kpi-cutoff-risks", tone: "rose" },
  { key: "forecastChanges", label: "ETA changes", icon: CalendarClock, testId: "cc-kpi-forecast-changes", tone: "blue" },
  { key: "rebookRequired", label: "Needs rebook", icon: RefreshCw, testId: "cc-kpi-rebook-required", tone: "violet" },
] as const satisfies ReadonlyArray<{
  key: keyof CommandCenterKpis;
  label: string;
  icon: KpiTileSpec["icon"];
  testId: string;
  tone: KpiTone;
}>;

export function BookingKpiRow({ kpis, loading }: { kpis?: CommandCenterKpis; loading?: boolean }) {
  const tiles: KpiTileSpec[] = BOOKING_KPIS.map(({ key, label, icon, testId, tone }) => ({
    key,
    label,
    to: "/buyer/rfq",
    icon,
    testId,
    tone,
    value: kpis?.[key] ?? 0,
  }));

  return (
    <KpiTileGrid
      tiles={tiles}
      loading={loading}
      testId="cc-booking-kpi-row"
      columnsClass="grid-cols-2 sm:grid-cols-3 xl:grid-cols-5"
    />
  );
}
