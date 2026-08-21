import { FileText, Gavel, Package, Ship, MessageSquare, AlertCircle, Calculator } from "lucide-react";
import type { CommandCenterKpis } from "../../lib/buyer-command-center";
import { useT } from "@/i18n/useT";
import { KpiTileGrid, type KpiTileSpec, type KpiTone } from "./KpiTileGrid";

const KPIS = [
  { key: "openRfqs", labelKey: "rfq.list.title", fallback: "Open RFQs", to: "/buyer/rfq", icon: FileText, testId: "cc-kpi-open-rfqs", tone: "accent" },
  { key: "liveAuctions", labelKey: "cb.list.title", fallback: "Live Auctions", to: "/buyer/commoditybid", icon: Gavel, testId: "cc-kpi-live-auctions", tone: "emerald" },
  { key: "awaitingAuctionApproval", labelKey: "dash.kpi.awaitingApproval", fallback: "Awaiting Approval", to: "/buyer/commoditybid", icon: AlertCircle, testId: "cc-kpi-awaiting-auction-approval", tone: "amber" },
  { key: "activeOrders", labelKey: "dash.kpi.activeOrders", fallback: "Active Orders", to: "/buyer/orders", icon: Package, testId: "cc-kpi-active-orders", tone: "blue" },
  { key: "shipmentsInTransit", labelKey: "dash.kpi.shipmentsInTransit", fallback: "Shipments in transit", to: "/shipments/portfolio", icon: Ship, testId: "cc-kpi-shipments", tone: "violet" },
  { key: "unreadMessages", labelKey: "dash.kpi.unreadMessages", fallback: "Unread Messages", to: "/buyer/messages", icon: MessageSquare, testId: "cc-kpi-unread-messages", tone: "rose" },
  { key: "estimatedCifReady", labelKey: "dash.kpi.estimatedCifReady", fallback: "Est. CIF Ready", to: "/buyer/rfq", icon: Calculator, testId: "cc-kpi-estimated-cif-ready", tone: "accent" },
] as const satisfies ReadonlyArray<{
  key: keyof CommandCenterKpis;
  labelKey: string;
  fallback: string;
  to: string;
  icon: KpiTileSpec["icon"];
  testId: string;
  tone: KpiTone;
}>;

export function KpiRow({ kpis, loading }: { kpis?: CommandCenterKpis; loading?: boolean }) {
  const { t } = useT();
  const tiles: KpiTileSpec[] = KPIS.map(({ key, labelKey, fallback, to, icon, testId, tone }) => ({
    key,
    label: t(labelKey, fallback),
    to,
    icon,
    testId,
    tone,
    value: kpis?.[key] ?? 0,
  }));

  return (
    <KpiTileGrid
      tiles={tiles}
      loading={loading}
      testId="cc-kpi-row"
      guide="dashboard-kpis"
      columnsClass="grid-cols-2 sm:grid-cols-3 xl:grid-cols-7"
    />
  );
}
