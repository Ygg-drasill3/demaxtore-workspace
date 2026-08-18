import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { forwarderApi } from "../lib/forwarder.api";
import { useAuth } from "@/store/auth.store";

export default function ForwarderDashboardPage() {
  const user = useAuth((s) => s.user);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["forwarder", "shipments"],
    queryFn: forwarderApi.listShipments,
  });

  return (
    <div data-testid="forwarder-dashboard" data-guide="forwarder-requests" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">Forwarder portal</span>
        <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">Shipments</h1>
        <p className="text-sm text-zinc-500 mt-1">Welcome, {user?.displayName}</p>
      </header>

      {isLoading && <p className="text-sm text-zinc-500">Loading shipments…</p>}
      {isError && (
        <div>
          <p className="text-sm text-red-600">Failed to load shipments.</p>
          <button type="button" className="dmx-btn-secondary text-sm mt-2" onClick={() => void refetch()}>Retry</button>
        </div>
      )}
      {data && data.length === 0 && (
        <p className="text-sm text-zinc-500">No assigned shipments yet.</p>
      )}
      {data && data.length > 0 && (
        <ul data-guide="forwarder-shipments" className="divide-y divide-paper-200 dmx-card">
          {data.map((s) => (
            <li key={s.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink-900">{s.externalRef}</p>
                <p className="text-xs text-zinc-500">{s.state} · {new Date(s.createdAt).toLocaleString()}</p>
              </div>
              <Link to={`/forwarder/shipments/${s.id}`} className="dmx-btn-secondary text-sm">Open</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
