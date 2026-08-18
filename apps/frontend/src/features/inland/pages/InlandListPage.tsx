import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { inlandApi } from "../lib/inland.api";

const FILTERS: Array<{ id: string; label: string; params: Record<string, string | boolean> }> = [
  { id: "attention", label: "Needs Attention", params: { attention: true } },
  { id: "requested", label: "Awaiting Trucker", params: { status: "REQUESTED" } },
  { id: "scheduled", label: "Pickup Scheduled", params: { status: "PICKUP_SCHEDULED" } },
  { id: "ready", label: "Ready for Pickup", params: { status: "READY_FOR_PICKUP" } },
  { id: "transit", label: "In Transit", params: { status: "IN_TRANSIT" } },
  { id: "delivered", label: "Delivered", params: { status: "DELIVERED" } },
];

export default function InlandListPage() {
  const [filter, setFilter] = useState("attention");
  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["inland", "list", filter],
    queryFn: () => inlandApi.list(active.params),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6" data-testid="inland-list-page">
      <header>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Turkey Inland</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Inland Delivery</h1>
        <p className="text-sm text-zinc-600">
          After customs clearance — trucker assignment, pickup, transit, and POD. No GPS tracking.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" data-testid="inland-filters">
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

      {isLoading && <p className="text-sm text-zinc-500">Loading inland deliveries…</p>}
      {isError && (
        <p className="text-sm text-red-600">
          Failed to load.{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Retry
          </button>
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-paper-200 bg-white">
        <table className="min-w-full text-sm" data-testid="inland-table">
          <thead className="bg-paper-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">Shipment</th>
              <th className="px-3 py-2">Container</th>
              <th className="px-3 py-2">Customs</th>
              <th className="px-3 py-2">Trucker</th>
              <th className="px-3 py-2">Pickup</th>
              <th className="px-3 py-2">Destination</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">POD</th>
              <th className="px-3 py-2">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((d) => (
              <tr key={d.id} className="border-t border-paper-100" data-testid={`inland-row-${d.id}`}>
                <td className="px-3 py-2 font-medium">
                  <Link className="text-blue-600 hover:underline" to={`/buyer/inland/${d.id}`}>
                    {d.shipmentRef ?? d.shipmentWorkspaceId.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-3 py-2">{d.containerNumber ?? "—"}</td>
                <td className="px-3 py-2">{d.customsCleared ? "CLEARED" : "Pending"}</td>
                <td className="px-3 py-2">{d.truckerUserId ? "Assigned" : "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {d.pickupAt ? new Date(d.pickupAt).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2">
                  {[d.deliveryCity, d.deliveryAddress].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-3 py-2">{d.status.replace(/_/g, " ")}</td>
                <td className="px-3 py-2">{d.podStatus.replace(/_/g, " ")}</td>
                <td className="px-3 py-2 text-xs">{d.nextAction ?? "—"}</td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && !isLoading && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-zinc-500">
                  No inland deliveries in this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
