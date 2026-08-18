import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { taskApi } from "@/features/operational-task/lib/task.api";
import { taskKeys } from "@/features/operational-task/lib/task.query-keys";

export function OperationalTasksDashboardWidget() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: taskKeys.summary(),
    queryFn: () => taskApi.summary(),
  });

  return (
    <section className="dmx-card p-4 space-y-3" data-testid="ops-tasks-widget">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Operational Tasks</h2>
        <Link to="/workspace/tasks" className="text-xs underline">My Tasks</Link>
      </div>
      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : isError ? (
        <button type="button" className="text-sm text-red-600 underline" onClick={() => void refetch()}>Retry</button>
      ) : data ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          <Stat to="/workspace/tasks" label="Open" value={data.open} />
          <Stat to="/workspace/tasks" label="Overdue" value={data.overdue} />
          <Stat to="/workspace/tasks" label="Due today" value={data.dueToday} />
          <Stat to="/workspace/tasks" label="Mine" value={data.mine} />
          <Stat to="/workspace/tasks" label="High" value={data.highPriority} />
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
