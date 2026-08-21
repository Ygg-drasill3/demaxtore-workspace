import { Activity, Factory, Ship, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { TradeTimelineKpiDto } from "@dmx/contracts/trade-timeline";
import { useT } from "@/i18n/useT";
import { KpiTileGrid, type KpiTileSpec, type KpiTone } from "./KpiTileGrid";

const TIMELINE_KPIS = [
  { key: "activeTrades", labelKey: "dash.kpi.activeTrades", fallback: "Active orders", icon: Activity, testId: "cc-kpi-active-trades", tone: "accent" },
  { key: "tradesInProduction", labelKey: "dash.kpi.inProduction", fallback: "In preparation", icon: Factory, testId: "cc-kpi-trades-production", tone: "blue" },
  { key: "tradesInTransit", labelKey: "dash.kpi.tradesInTransit", fallback: "In transit", icon: Ship, testId: "cc-kpi-trades-transit", tone: "violet" },
  { key: "delayedTrades", labelKey: "dash.kpi.delayed", fallback: "Delayed", icon: AlertTriangle, testId: "cc-kpi-trades-delayed", tone: "rose" },
  { key: "completedTrades", labelKey: "dash.kpi.completed", fallback: "Completed", icon: CheckCircle2, testId: "cc-kpi-trades-completed", tone: "emerald" },
] as const satisfies ReadonlyArray<{
  key: keyof TradeTimelineKpiDto;
  labelKey: string;
  fallback: string;
  icon: KpiTileSpec["icon"];
  testId: string;
  tone: KpiTone;
}>;

export function TimelineKpiRow({ kpis, loading }: { kpis?: TradeTimelineKpiDto; loading?: boolean }) {
  const { t } = useT();
  const tiles: KpiTileSpec[] = TIMELINE_KPIS.map(({ key, labelKey, fallback, icon, testId, tone }) => ({
    key,
    label: t(labelKey, fallback),
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
      testId="cc-timeline-kpi-row"
      columnsClass="grid-cols-2 sm:grid-cols-3 xl:grid-cols-5"
    />
  );
}
