import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { OPERATIONAL_ISSUE_CATEGORY_LABELS } from "@dmx/contracts/operational-issue";
import { issueApi } from "../lib/issue.api";
import { issueKeys } from "../lib/issue.query-keys";
import { IssueDrawer } from "../components/IssueDrawer";

export default function OperationalIssuesPage() {
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      page: 1,
      pageSize: 50,
      ...(status ? { status } : {}),
      ...(severity ? { severity } : {}),
      ...(category ? { category } : {}),
    }),
    [status, severity, category],
  );

  const { data: summary } = useQuery({
    queryKey: issueKeys.summary(),
    queryFn: () => issueApi.summary(),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: issueKeys.list(params),
    queryFn: () => issueApi.list(params),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6" data-testid="operational-issues-page">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Operations</p>
        <h1 className="text-2xl font-semibold">Operational Issues</h1>
        <p className="text-sm text-zinc-600">
          Track business exceptions across Order, Shipment and Inspection — independent of FSM.
        </p>
      </header>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="issue-summary-widgets">
          <Widget label="Open" value={summary.open} onClick={() => setStatus("")} />
          <Widget label="Critical" value={summary.critical} onClick={() => setSeverity("CRITICAL")} />
          <Widget label="Resolved today" value={summary.resolvedToday} onClick={() => setStatus("RESOLVED")} />
          <Widget label="Inspection failures" value={summary.inspectionFailures} onClick={() => setCategory("INSPECTION_FAILURE")} />
          <Widget label="Shipment delays" value={summary.shipmentDelays} onClick={() => setCategory("SHIPMENT_DELAY")} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="text-zinc-500">Status</span>
          <select className="block rounded border px-2 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="text-zinc-500">Severity</span>
          <select className="block rounded border px-2 py-1.5 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value)} aria-label="Filter by severity">
            <option value="">All</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="text-zinc-500">Category</span>
          <select className="block rounded border px-2 py-1.5 text-sm" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="">All</option>
            {Object.entries(OPERATIONAL_ISSUE_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : isError ? (
        <button type="button" className="text-sm text-red-600 underline" onClick={() => void refetch()}>Retry</button>
      ) : !data?.items.length ? (
        <p className="text-sm text-zinc-500" data-testid="issues-empty">No operational issues.</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm" data-testid="issues-table">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b">
                  <th className="py-2 pr-2">Title</th>
                  <th className="py-2 pr-2">Impact</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2">Severity</th>
                  <th className="py-2 pr-2">Owner</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2">Order</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((issue) => (
                  <tr
                    key={issue.id}
                    className="border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer"
                    data-testid={`issue-row-${issue.id}`}
                    onClick={() => setSelectedId(issue.id)}
                  >
                    <td className="py-2 pr-2 font-medium">{issue.title}</td>
                    <td className="py-2 pr-2 text-xs">{issue.impactType?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="py-2 pr-2">{OPERATIONAL_ISSUE_CATEGORY_LABELS[issue.category] ?? issue.category}</td>
                    <td className="py-2 pr-2">{issue.severity}</td>
                    <td className="py-2 pr-2 text-xs">{issue.ownerRole ?? "—"}</td>
                    <td className="py-2 pr-2">{issue.status}</td>
                    <td className="py-2">
                      <Link className="underline" to={`/workspace/order/${issue.orderId}`} onClick={(e) => e.stopPropagation()}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="md:hidden space-y-2">
            {data.items.map((issue) => (
              <li key={issue.id}>
                <button
                  type="button"
                  className="w-full text-left rounded-xl border border-zinc-100 p-3 space-y-1"
                  onClick={() => setSelectedId(issue.id)}
                >
                  <p className="font-medium text-sm">{issue.title}</p>
                  <p className="text-xs text-zinc-500">
                    {issue.status} · {issue.severity}
                    {issue.impactType ? ` · ${issue.impactType.replace(/_/g, " ")}` : ""}
                    {issue.ownerRole ? ` · ${issue.ownerRole}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {selectedId && <IssueDrawer issueId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function Widget({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-paper-100 p-3 text-left hover:bg-paper-50">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </button>
  );
}
