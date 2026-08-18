import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { taskApi } from "../lib/task.api";
import { taskKeys } from "../lib/task.query-keys";
import { TaskDrawer } from "../components/TaskDrawer";

export default function MyTasksPage() {
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [mine, setMine] = useState(true);
  const [overdue, setOverdue] = useState(false);
  const [dueToday, setDueToday] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      page: 1,
      pageSize: 50,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(mine ? { mine: true } : {}),
      ...(overdue ? { overdue: true } : {}),
      ...(dueToday ? { dueToday: true } : {}),
    }),
    [status, priority, mine, overdue, dueToday],
  );

  const { data: summary } = useQuery({
    queryKey: taskKeys.summary(),
    queryFn: () => taskApi.summary(),
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => taskApi.list(params),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6" data-testid="my-tasks-page">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Operations</p>
        <h1 className="text-2xl font-semibold">Operational Tasks</h1>
        <p className="text-sm text-zinc-600">Assign and complete work across Order, Shipment and Inspection.</p>
      </header>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="task-summary-widgets">
          <Widget label="Open" value={summary.open} onClick={() => { setMine(false); setOverdue(false); setDueToday(false); setStatus(""); }} />
          <Widget label="Overdue" value={summary.overdue} onClick={() => { setOverdue(true); setDueToday(false); setMine(false); }} />
          <Widget label="Due today" value={summary.dueToday} onClick={() => { setDueToday(true); setOverdue(false); setMine(false); }} />
          <Widget label="My tasks" value={summary.mine} onClick={() => { setMine(true); setOverdue(false); setDueToday(false); }} />
          <Widget label="High priority" value={summary.highPriority} onClick={() => { setPriority("HIGH"); setMine(false); }} />
          <Widget label="Completed today" value={summary.completedToday} onClick={() => { setStatus("COMPLETED"); setMine(false); setOverdue(false); setDueToday(false); }} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="text-zinc-500">Status</span>
          <select className="block rounded border px-2 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="text-zinc-500">Priority</span>
          <select className="block rounded border px-2 py-1.5 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
            <option value="">All</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          Assigned to me
        </label>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading tasks…</p>
      ) : isError ? (
        <div>
          <p className="text-sm text-red-600">Failed to load tasks.</p>
          <button type="button" className="text-sm underline" onClick={() => void refetch()}>Retry</button>
        </div>
      ) : !data?.items.length ? (
        <p className="text-sm text-zinc-500" data-testid="tasks-empty">No operational tasks.</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto dmx-card">
            <table className="w-full text-sm" role="table" aria-label="Operational tasks">
              <thead>
                <tr className="text-left text-zinc-500 border-b">
                  <th className="p-3">Title</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Assignee</th>
                  <th className="p-3">Due</th>
                  <th className="p-3">Related</th>
                  <th className="p-3">Order</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((t) => (
                  <tr key={t.id} className="border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer" onClick={() => setSelectedId(t.id)}>
                    <td className="p-3 font-medium">{t.title}</td>
                    <td className="p-3">{t.status}</td>
                    <td className="p-3">{t.priority}</td>
                    <td className="p-3">{t.assignedTo?.name ?? "—"}</td>
                    <td className="p-3">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                    <td className="p-3">{t.relatedEntityType ?? "—"}</td>
                    <td className="p-3">
                      <Link className="underline" to={`/workspace/order/${t.orderId}`} onClick={(e) => e.stopPropagation()}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="md:hidden space-y-3">
            {data.items.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="dmx-card w-full text-left p-3 space-y-1"
                  onClick={() => setSelectedId(t.id)}
                >
                  <div className="font-medium text-sm">{t.title}</div>
                  <div className="text-xs text-zinc-500">{t.status} · {t.priority}</div>
                  <div className="text-xs text-zinc-500">{t.assignedTo?.name ?? "Unassigned"}</div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {selectedId && <TaskDrawer taskId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function Widget({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="dmx-card p-3 text-left hover:bg-zinc-50">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
    </button>
  );
}
