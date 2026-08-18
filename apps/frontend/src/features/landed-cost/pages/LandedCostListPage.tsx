import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { landedCostApi } from "../lib/landed-cost.api";

export default function LandedCostListPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["landed-cost", "list"],
    queryFn: landedCostApi.list,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6" data-testid="landed-cost-list-page">
      <header>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Import Economics</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Landed Cost</h1>
        <p className="text-sm text-zinc-600">
          Customer transaction cost rollup — estimated vs actual. Unknown costs are never shown as zero.
        </p>
      </header>

      {isLoading && <p className="text-sm text-zinc-500">Loading…</p>}
      {isError && (
        <p className="text-sm text-red-600">
          Failed to load.{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-paper-200 bg-white">
        <table className="min-w-full text-sm" data-testid="landed-cost-table">
          <thead className="bg-paper-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">Shipment</th>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Currency</th>
              <th className="px-3 py-2">Known subtotal</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Missing</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((c) => (
              <tr key={c.id} className="border-t border-paper-100">
                <td className="px-3 py-2 font-medium">
                  <Link className="text-blue-600 hover:underline" to={`/buyer/landed-cost/${c.id}`}>
                    {(c.shipmentWorkspaceId ?? c.scopeId).slice(0, 8)}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs">{c.displayLabel}</td>
                <td className="px-3 py-2">{c.status}</td>
                <td className="px-3 py-2">{c.calculationCurrency}</td>
                <td className="px-3 py-2 tabular-nums">{c.knownSubtotal.toLocaleString()}</td>
                <td className="px-3 py-2 tabular-nums">
                  {c.totalLandedCost != null ? c.totalLandedCost.toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2">{c.missingComponentCount}</td>
                <td className="px-3 py-2 text-xs">{new Date(c.calculatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && !isLoading && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-zinc-500">
                  No landed cost calculations yet. Open a shipment and calculate.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
