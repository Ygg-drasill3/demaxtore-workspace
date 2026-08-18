import React from "react";
import { FileSearch, FileSpreadsheet, PackageCheck, FolderOpenDot, Activity } from "lucide-react";
import { WidgetCard } from "@/components/common/WidgetCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { buyerWidgets } from "@/lib/mockData";
import { Link } from "react-router-dom";

export default function BuyerDashboard() {
  const w = buyerWidgets;
  return (
    <div data-testid="buyer-dashboard" className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="dmx-label">Buyer Workspace</span>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-950 mt-1">
            Welcome back, Bianca.
          </h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-xl">
            A snapshot of your active sourcing pipeline. Sprint 1 ships the foundation — RFQ, Quotation, and PO workflows arrive in upcoming sprints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge type="INFO">Sprint 1 · Foundation</StatusBadge>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <WidgetCard
          testId="widget-active-rfqs"
          label="Active RFQs"
          value={w.activeRfqs.count}
          delta={w.activeRfqs.delta}
          icon={FileSearch}
        />
        <WidgetCard
          testId="widget-pending-quotations"
          label="Pending Quotations"
          value={w.pendingQuotations.count}
          delta={w.pendingQuotations.delta}
          icon={FileSpreadsheet}
        />
        <WidgetCard
          testId="widget-active-orders"
          label="Active Orders"
          value={w.activeOrders.count}
          delta={w.activeOrders.delta}
          icon={PackageCheck}
        />
        <WidgetCard
          testId="widget-documents"
          label="Documents"
          value={w.documents.count}
          delta={w.documents.delta}
          icon={FolderOpenDot}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 dmx-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-zinc-500" />
              <h3 className="font-display text-base font-semibold tracking-tight">Recent activity</h3>
            </div>
            <StatusBadge type="INFO">Mock</StatusBadge>
          </div>
          <ul className="divide-y divide-zinc-100">
            {w.recentActivity.map((it) => (
              <li key={it.id} className="py-3 flex items-start gap-3" data-testid={`activity-${it.id}`}>
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-300" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-900">
                    <span className="font-medium">{it.actor}</span>{" "}
                    <span className="text-zinc-500">{it.action}</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">{it.time}</div>
                </div>
                <StatusBadge type={it.type}>{it.type}</StatusBadge>
              </li>
            ))}
          </ul>
        </div>

        <div className="dmx-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-base font-semibold tracking-tight">Open a workspace</h3>
          </div>
          <p className="text-sm text-zinc-500 mb-4">
            Workspaces are the single surface where Timeline, Documents, Next Actions, and Participants converge.
          </p>
          <div className="space-y-2">
            <Link
              data-testid="open-rfq-workspace"
              to="/workspace/rfq/WS-RFQ-DEMO-001"
              className="block px-3 py-2.5 rounded-lg border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-colors"
            >
              <div className="text-xs dmx-label">RFQ</div>
              <div className="text-sm font-medium text-zinc-900">WS-RFQ-DEMO-001</div>
            </Link>
            <Link
              data-testid="open-commoditybid-workspace"
              to="/workspace/commoditybid/WS-CB-DEMO-001"
              className="block px-3 py-2.5 rounded-lg border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-colors"
            >
              <div className="text-xs dmx-label">CommodityBid</div>
              <div className="text-sm font-medium text-zinc-900">WS-CB-DEMO-001</div>
            </Link>
            <Link
              data-testid="open-order-workspace"
              to="/workspace/order/WS-ORD-DEMO-001"
              className="block px-3 py-2.5 rounded-lg border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 transition-colors"
            >
              <div className="text-xs dmx-label">Order</div>
              <div className="text-sm font-medium text-zinc-900">WS-ORD-DEMO-001</div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
