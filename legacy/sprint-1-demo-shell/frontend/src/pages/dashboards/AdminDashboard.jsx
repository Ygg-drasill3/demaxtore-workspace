import React from "react";
import { FileSearch, Users, Layers, Activity } from "lucide-react";
import { WidgetCard } from "@/components/common/WidgetCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { adminWidgets } from "@/lib/mockData";

export default function AdminDashboard() {
  const w = adminWidgets;
  return (
    <div data-testid="admin-dashboard" className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <span className="dmx-label">Operator Console</span>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-950 mt-1">
            Operations overview.
          </h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-xl">
            Triage incoming RFQs, govern supplier assignments, and monitor active workspaces.
          </p>
        </div>
        <StatusBadge type="SUCCESS">System healthy</StatusBadge>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <WidgetCard
          testId="widget-new-rfqs"
          label="New RFQs"
          value={w.newRfqs.count}
          delta={w.newRfqs.delta}
          icon={FileSearch}
        />
        <WidgetCard
          testId="widget-supplier-assignments"
          label="Supplier Assignments"
          value={w.supplierAssignments.count}
          delta={w.supplierAssignments.delta}
          icon={Users}
        />
        <WidgetCard
          testId="widget-open-workspaces"
          label="Open Workspaces"
          value={w.openWorkspaces.count}
          delta={w.openWorkspaces.delta}
          icon={Layers}
        />
      </section>

      <section className="dmx-card p-6">
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
      </section>
    </div>
  );
}
