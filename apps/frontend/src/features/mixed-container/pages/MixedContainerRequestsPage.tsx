import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { mixedContainerApi } from "../lib/mixed-container.api";

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

import { PROCUREMENT_STATUS_LABELS } from "@dmx/contracts/mixed-container-procurement";

function stateLabel(s: string, procurementStatus?: string) {
  if (procurementStatus && PROCUREMENT_STATUS_LABELS[procurementStatus as keyof typeof PROCUREMENT_STATUS_LABELS]) {
    return PROCUREMENT_STATUS_LABELS[procurementStatus as keyof typeof PROCUREMENT_STATUS_LABELS];
  }
  return s.replace(/^MC_/, "").replace(/_/g, " ");
}

export default function MixedContainerRequestsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["mc-requests"],
    queryFn: () => mixedContainerApi.list(),
  });

  return (
    <div data-testid="mc-requests-page" data-guide="mc-requests" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/buyer/mixed-container" className="text-xs text-zinc-500 hover:underline">← Mixed Container</Link>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">My Mixed Containers</h1>
        </div>
        <Link to="/buyer/mixed-container/catalog" className="dmx-btn-primary" data-testid="mc-requests-new">
          Build Mixed Container
        </Link>
      </header>

      <div className="dmx-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3">Reference</th>
              <th className="text-left px-4 py-3">PR Number</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Products</th>
              <th className="text-left px-4 py-3">Pallets</th>
              <th className="text-left px-4 py-3">Est. Value</th>
              <th className="text-left px-4 py-3">Last Activity</th>
              <th className="text-left px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-zinc-400">Loading…</td></tr>
            )}
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} data-testid={`mc-request-row-${row.externalRef}`} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-medium">{row.externalRef}</td>
                <td className="px-4 py-3">{row.procurementRequestRef ?? "—"}</td>
                <td className="px-4 py-3"><span className="text-xs uppercase">{stateLabel(row.state, row.procurementStatus)}</span></td>
                <td className="px-4 py-3">{row.productCount}</td>
                <td className="px-4 py-3">{row.currentPalletCount}</td>
                <td className="px-4 py-3">{fmtMoney(row.estValueMin)} – {fmtMoney(row.estValueMax)}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(row.updatedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Link to={`/buyer/mixed-container/requests/${row.id}`} className="text-accent-900 text-sm font-medium hover:underline" data-testid={`mc-open-${row.id}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {!isLoading && (data?.items ?? []).length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-zinc-400">No containers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
