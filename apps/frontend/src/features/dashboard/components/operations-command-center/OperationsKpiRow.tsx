import { Link } from "react-router-dom";
import {
  Activity, Gavel, ClipboardCheck, Ship, AlertTriangle, DollarSign, MessageSquare, Ban,
} from "lucide-react";
import type { OperationsKpis } from "../../lib/operations-command-center";

const KPIS = [
  { key: "activeTrades" as const, label: "Active Trades", to: "#oc-trade-board", icon: Activity, testId: "oc-kpi-active-trades" },
  { key: "liveAuctions" as const, label: "Live Auctions", to: "#oc-auction-monitor", icon: Gavel, testId: "oc-kpi-live-auctions" },
  { key: "pendingApprovals" as const, label: "Pending Approvals", to: "#oc-action-inbox", icon: ClipboardCheck, testId: "oc-kpi-pending-approvals" },
  { key: "shipmentsInTransit" as const, label: "In Transit", to: "#oc-shipments", icon: Ship, testId: "oc-kpi-shipments" },
  { key: "openAlerts" as const, label: "Open Alerts", to: "#oc-control-tower", icon: AlertTriangle, testId: "oc-kpi-open-alerts" },
  { key: "todaysRevenue" as const, label: "Revenue", to: "#oc-revenue", icon: DollarSign, testId: "oc-kpi-revenue" },
  { key: "unreadMessages" as const, label: "Comm Escalations", to: "#oc-communications", icon: MessageSquare, testId: "oc-kpi-messages" },
  { key: "blockedProcesses" as const, label: "Blocked", to: "#oc-action-inbox", icon: Ban, testId: "oc-kpi-blocked" },
];

export function OperationsKpiRow({ kpis, loading }: { kpis?: OperationsKpis; loading?: boolean }) {
  return (
    <section data-testid="oc-kpi-row" className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
      {KPIS.map(({ key, label, to, icon: Icon, testId }) => (
        <Link key={key} to={to} data-testid={testId} className="dmx-card dmx-card-hover p-4 flex items-center gap-3 min-h-[88px]">
          <div className="h-9 w-9 rounded-lg bg-violet-50 text-violet-900 grid place-items-center shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 truncate">{label}</div>
            <div className="font-display text-2xl font-semibold mt-0.5 tabular-nums">
              {loading ? "—" : key === "todaysRevenue" ? `$${(kpis?.[key] ?? 0).toLocaleString()}` : (kpis?.[key] ?? 0)}
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}
