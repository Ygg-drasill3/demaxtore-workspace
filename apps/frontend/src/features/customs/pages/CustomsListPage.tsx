import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { customsApi } from "../lib/customs.api";

const FILTERS: Array<{ id: string; label: string; params: Record<string, string | boolean> }> = [
  { id: "attention", label: "Needs Attention", params: { attention: true } },
  { id: "not_ready", label: "Not Ready", params: { readiness: "NOT_READY" } },
  { id: "broker", label: "Broker Review", params: { status: "BROKER_REVIEW" } },
  { id: "filed", label: "Filed", params: { status: "DECLARATION_FILED" } },
  { id: "processing", label: "Processing", params: { status: "CUSTOMS_PROCESSING" } },
  { id: "hold", label: "Hold", params: { status: "HOLD" } },
  { id: "cleared", label: "Cleared", params: { status: "CLEARED" } },
];

export default function CustomsListPage() {
  const [filter, setFilter] = useState("attention");
  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customs", "list", filter],
    queryFn: () => customsApi.list({ ...active.params, page: 1, pageSize: 50 }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6" data-testid="customs-list-page">
      <header>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Turkey Customs</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Customs Control Center</h1>
        <p className="text-sm text-zinc-600">
          Operational readiness, broker assignment, and declaration tracking — not a government filing system.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" data-testid="customs-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              filter === f.id ? "border-accent-900 bg-accent-900 text-white" : "border-paper-200 bg-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-zinc-500">Loading customs cases…</p>}
      {isError && (
        <p className="text-sm text-red-600">
          Failed to load.{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-paper-200 bg-white">
        <table className="min-w-full text-sm" data-testid="customs-table">
          <thead className="bg-paper-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">Shipment</th>
              <th className="px-3 py-2">Origin</th>
              <th className="px-3 py-2">Destination</th>
              <th className="px-3 py-2">ETA / ATA</th>
              <th className="px-3 py-2">Readiness</th>
              <th className="px-3 py-2">Customs Status</th>
              <th className="px-3 py-2">Declaration</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((c) => (
              <tr key={c.id} className="border-t border-paper-100" data-testid={`customs-row-${c.id}`}>
                <td className="px-3 py-2 font-medium">
                  <Link className="text-blue-600 hover:underline" to={`/buyer/customs/${c.id}`}>
                    {c.shipmentRef ?? c.shipmentWorkspaceId.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-3 py-2">{c.originPort ?? "—"}</td>
                <td className="px-3 py-2">{c.destinationPort ?? c.destinationCountryCode ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {c.eta ? new Date(c.eta).toLocaleDateString() : "—"}
                  {c.ata ? ` / ${new Date(c.ata).toLocaleDateString()}` : ""}
                </td>
                <td className="px-3 py-2">
                  <StatusPill value={c.readinessStatus} />
                </td>
                <td className="px-3 py-2">
                  <StatusPill value={c.status} tone={c.status === "HOLD" ? "danger" : undefined} />
                </td>
                <td className="px-3 py-2 text-xs">{c.declarationReference ?? "Not filed"}</td>
              </tr>
            ))}
            {!isLoading && (data?.items?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-zinc-500">
                  No customs cases for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ value, tone }: { value: string; tone?: "danger" }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${
        tone === "danger"
          ? "bg-red-50 text-red-700"
          : value.includes("READY") || value === "CLEARED"
            ? "bg-emerald-50 text-emerald-800"
            : "bg-amber-50 text-amber-800"
      }`}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}
