import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { bulkContainerApi } from "../lib/bulk-container.api";
import { BC_STATE_LABELS } from "@dmx/contracts/bulk-container.fsm";

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function BulkContainerRequestsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["bc-requests"],
    queryFn: () => bulkContainerApi.list(),
  });

  return (
    <div data-testid="bc-requests-page" data-guide="bc-requests" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link to="/buyer/bulk-container" className="text-xs text-zinc-500 hover:underline">← BulkContainer</Link>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">My Bulk Containers</h1>
        </div>
        <Link to="/buyer/bulk-container/catalog" className="dmx-btn-primary">
          Build Bulk Container
        </Link>
      </header>

      <div className="dmx-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3">Reference</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Products</th>
              <th className="text-left px-4 py-3">Weight (MT)</th>
              <th className="text-left px-4 py-3">Fill</th>
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
              <tr key={row.id} data-testid={`bc-request-row-${row.externalRef}`} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-medium">{row.externalRef}</td>
                <td className="px-4 py-3">
                  <span className="text-xs uppercase">
                    {BC_STATE_LABELS[row.state as keyof typeof BC_STATE_LABELS] ?? row.state}
                  </span>
                </td>
                <td className="px-4 py-3">{row.productCount}</td>
                <td className="px-4 py-3">{row.currentWeightMt.toFixed(2)}</td>
                <td className="px-4 py-3">{row.fillPercent}%</td>
                <td className="px-4 py-3">{fmtMoney(row.estValueMin)} – {fmtMoney(row.estValueMax)}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(row.updatedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/buyer/bulk-container/requests/${row.id}`}
                    className="text-accent-900 text-sm font-medium hover:underline"
                  >
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
