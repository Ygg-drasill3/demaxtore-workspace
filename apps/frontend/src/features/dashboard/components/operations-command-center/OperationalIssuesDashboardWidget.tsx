import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { issueApi } from "@/features/operational-issue/lib/issue.api";
import { issueKeys } from "@/features/operational-issue/lib/issue.query-keys";

export function OperationalIssuesDashboardWidget() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: issueKeys.summary(),
    queryFn: () => issueApi.summary(),
  });

  return (
    <section className="dmx-card p-4 space-y-3" data-testid="ops-issues-widget">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Operational Issues</h2>
        <Link to="/workspace/issues" className="text-xs underline">All issues</Link>
      </div>
      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : isError ? (
        <button type="button" className="text-sm text-red-600 underline" onClick={() => void refetch()}>
          Retry
        </button>
      ) : data ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          <Stat to="/workspace/issues" label="Open" value={data.open} />
          <Stat to="/workspace/issues" label="Critical" value={data.critical} />
          <Stat to="/workspace/issues" label="Resolved today" value={data.resolvedToday} />
          <Stat to="/workspace/issues" label="Inspection" value={data.inspectionFailures} />
          <Stat to="/workspace/issues" label="Ship delays" value={data.shipmentDelays} />
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="rounded-lg border border-paper-100 p-2 hover:bg-paper-50">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </Link>
  );
}
