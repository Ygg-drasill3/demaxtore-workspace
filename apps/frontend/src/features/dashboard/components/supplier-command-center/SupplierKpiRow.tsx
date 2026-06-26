import { Link } from "react-router-dom";
import { FileText, Gavel, ClipboardList, Package, Ship, MessageSquare } from "lucide-react";
import type { SupplierKpis } from "../../lib/supplier-command-center";

const KPIS = [
  { key: "pendingRfqInvites" as const, label: "RFQ Invitations", to: "/supplier/rfq", icon: FileText, testId: "sc-kpi-rfq-invites" },
  { key: "liveAuctions" as const, label: "Live Auctions", to: "/supplier/commoditybid", icon: Gavel, testId: "sc-kpi-live-auctions" },
  { key: "pendingPos" as const, label: "Pending POs", to: "/supplier/purchase-orders", icon: ClipboardList, testId: "sc-kpi-pending-pos" },
  { key: "activeOrders" as const, label: "Active Orders", to: "/supplier/orders", icon: Package, testId: "sc-kpi-active-orders" },
  { key: "shipmentsInProgress" as const, label: "Shipments", to: "/supplier/shipments", icon: Ship, testId: "sc-kpi-shipments" },
  { key: "unreadMessages" as const, label: "Unread Messages", to: "/supplier/messages", icon: MessageSquare, testId: "sc-kpi-unread-messages" },
];

export function SupplierKpiRow({ kpis, loading }: { kpis?: SupplierKpis; loading?: boolean }) {
  return (
    <section data-testid="sc-kpi-row" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {KPIS.map(({ key, label, to, icon: Icon, testId }) => (
        <Link key={key} to={to} data-testid={testId} className="dmx-card dmx-card-hover p-4 flex items-center gap-3 min-h-[88px]">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-800 grid place-items-center shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 truncate">{label}</div>
            <div className="font-display text-2xl font-semibold mt-0.5 tabular-nums">
              {loading ? "—" : (kpis?.[key] ?? 0)}
            </div>
          </div>
        </Link>
      ))}
    </section>
  );
}
