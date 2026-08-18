import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminMixedContainerApi } from "../lib/mixed-container.api";
import { PROCUREMENT_STATUS_LABELS } from "@dmx/contracts/mixed-container-procurement";
import { Button } from "@/components/ui/Button";

export default function AdminMixedContainerInboxPage() {
  const [status, setStatus] = useState("");
  const [managerId, setManagerId] = useState("");
  const [submittedFrom, setSubmittedFrom] = useState("");
  const [submittedTo, setSubmittedTo] = useState("");

  const filters = useMemo(() => ({
    ...(status ? { status } : {}),
    ...(managerId ? { managerId } : {}),
    ...(submittedFrom ? { submittedFrom: new Date(submittedFrom).toISOString() } : {}),
    ...(submittedTo ? { submittedTo: new Date(submittedTo).toISOString() } : {}),
  }), [status, managerId, submittedFrom, submittedTo]);

  const { data: kpis } = useQuery({ queryKey: ["mc-admin-kpis"], queryFn: () => adminMixedContainerApi.kpis() });
  const { data: managers } = useQuery({
    queryKey: ["mc-procurement-managers"],
    queryFn: () => adminMixedContainerApi.procurementManagers(),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["mc-admin-inbox", filters],
    queryFn: () => adminMixedContainerApi.inbox(filters),
  });

  const dash = kpis?.dashboard;

  return (
    <div data-testid="mc-admin-inbox-page" className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
      <header>
        <span className="dmx-eyebrow text-zinc-500">Operations · SmartContainer</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Procurement Queue</h1>
        <p className="text-sm text-zinc-500 mt-1">Review submitted procurement requests and manage sourcing progress.</p>
      </header>

      {dash && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="mc-admin-dashboard-widgets">
          {[
            ["New Requests", dash.newRequests, "mc-widget-new"],
            ["Assigned Requests", dash.assignedRequests, "mc-widget-assigned"],
            ["Waiting for Review", dash.waitingForReview, "mc-widget-review"],
            ["Proposal Preparation", dash.proposalPreparationQueue, "mc-widget-proposal"],
          ].map(([label, val, tid]) => (
            <div key={tid as string} data-testid={tid as string} className="dmx-card p-4">
              <p className="text-xs uppercase text-zinc-500">{label as string}</p>
              <p className="text-2xl font-display font-semibold mt-1">{val as number}</p>
            </div>
          ))}
        </div>
      )}

      <div className="dmx-card p-4 flex flex-wrap gap-3 items-end" data-testid="mc-inbox-filters">
        <label className="text-sm">
          <span className="text-xs uppercase text-zinc-500 block mb-1">Status</span>
          <select className="h-9 border rounded px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {Object.entries(PROCUREMENT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs uppercase text-zinc-500 block mb-1">Manager</span>
          <select className="h-9 border rounded px-2 text-sm min-w-[160px]" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">All</option>
            {(managers?.items ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs uppercase text-zinc-500 block mb-1">Submitted from</span>
          <input type="date" className="h-9 border rounded px-2 text-sm" value={submittedFrom} onChange={(e) => setSubmittedFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="text-xs uppercase text-zinc-500 block mb-1">Submitted to</span>
          <input type="date" className="h-9 border rounded px-2 text-sm" value={submittedTo} onChange={(e) => setSubmittedTo(e.target.value)} />
        </label>
      </div>

      <div className="dmx-card overflow-x-auto">
        {isLoading && <div className="p-8 animate-pulse h-40" />}
        <table className="w-full text-sm" data-testid="mc-admin-inbox-table">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="text-left p-3">PR Number</th>
              <th className="text-left p-3">Buyer</th>
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Destination</th>
              <th className="text-left p-3">Products</th>
              <th className="text-left p-3">Pallets</th>
              <th className="text-left p-3">Submitted</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Manager</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} data-testid={`mc-inbox-row-${row.procurementRequestRef ?? row.externalRef}`} className="border-t border-zinc-100">
                <td className="p-3 font-medium">{row.procurementRequestRef ?? row.externalRef}</td>
                <td className="p-3">{row.buyerName}</td>
                <td className="p-3">{row.buyerOrgName ?? "—"}</td>
                <td className="p-3">{row.destinationPort ?? "—"}</td>
                <td className="p-3">{row.productCount}</td>
                <td className="p-3">{row.currentPalletCount}</td>
                <td className="p-3 text-zinc-500">{row.submissionDate ? new Date(row.submissionDate).toLocaleDateString() : "—"}</td>
                <td className="p-3">{row.procurementStatus ? PROCUREMENT_STATUS_LABELS[row.procurementStatus as keyof typeof PROCUREMENT_STATUS_LABELS] : row.state}</td>
                <td className="p-3">{row.assignedManagerName ?? "—"}</td>
                <td className="p-3">
                  <Link to={`/admin/mixed-container/${row.id}`}>
                    <Button size="sm" variant="secondary" data-testid={`mc-open-request-${row.procurementRequestRef ?? row.externalRef}`}>Open</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
