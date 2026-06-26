import { useQuery } from "@tanstack/react-query";
import { systemApi } from "../lib/system.api";

export default function SystemOperationsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["system", "insights"],
    queryFn: systemApi.insights,
  });

  if (isLoading) {
    return (
      <div data-testid="system-loading" className="p-8 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div data-testid="query-state-error" className="max-w-lg mx-auto p-8 text-center space-y-3">
        <p className="text-sm text-red-600">Could not load system operations.</p>
        <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  const m = data;

  return (
    <div data-testid="system-operations-page" className="max-w-[1400px] mx-auto space-y-6 p-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">System operations</h1>
          <p className="text-sm text-zinc-500">
            Enterprise readiness — jobs, health, storage, backup (admin only)
          </p>
        </div>
        <a
          href="/api/system/export/jobs.csv"
          data-testid="system-csv-export"
          className="text-sm text-primary underline"
        >
          Export jobs (CSV)
        </a>
      </header>

      <section className="dmx-card p-4" data-testid="system-health-panel">
        <h2 className="text-sm font-medium mb-2">System health</h2>
        <p className="text-xs text-zinc-600">
          Overall: <strong>{m?.health?.overall ?? "—"}</strong> · uptime {m?.health?.uptimeSec ?? 0}s
        </p>
        <ul className="text-xs mt-2 space-y-1">
          {(m?.health?.components ?? []).map((c) => (
            <li key={c.key}>
              {c.label}: {c.status}
              {c.detail ? ` — ${c.detail}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="system-job-status">
          <h2 className="text-sm font-medium mb-2">Job status</h2>
          <ul className="text-xs space-y-1">
            {(m?.jobs ?? []).map((j) => (
              <li key={j.job.name}>
                {j.job.label}: {j.lastRun?.status ?? "never"} {j.stale ? "(stale)" : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="dmx-card p-4" data-testid="system-failed-jobs">
          <h2 className="text-sm font-medium mb-2">Failed jobs (7d)</h2>
          <ul className="text-xs space-y-1">
            {(m?.failedJobs ?? []).slice(0, 8).map((f) => (
              <li key={f.jobName}>
                {f.jobName}: {f.failures}× — {f.lastError ?? "—"}
              </li>
            ))}
            {!m?.failedJobs?.length && <li className="text-zinc-500">No recent failures</li>}
          </ul>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="system-scheduler-status">
          <h2 className="text-sm font-medium mb-2">Scheduler status</h2>
          <ul className="text-xs space-y-1">
            {(m?.schedulers ?? []).map((s) => (
              <li key={s.name}>
                {s.name}: {s.healthy ? "healthy" : "unhealthy"} · lock {s.lockId}
              </li>
            ))}
          </ul>
        </div>
        <div className="dmx-card p-4" data-testid="system-storage-health">
          <h2 className="text-sm font-medium mb-2">Storage health</h2>
          <p className="text-xs">
            Dir: {m?.storage?.storageDir ?? "—"} · accessible={String(m?.storage?.accessible ?? false)} · refs{" "}
            {m?.storage?.totalReferences ?? 0} · missing {m?.storage?.missingFiles ?? 0}
          </p>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="dmx-card p-4" data-testid="system-backup-status">
          <h2 className="text-sm font-medium mb-2">Backup status</h2>
          <p className="text-xs">
            Last backup: {m?.backup?.lastBackupCheck ?? "never"} ({m?.backup?.lastBackupStatus ?? "—"})
            {m?.backup?.backupOverdue ? " — OVERDUE" : ""}
          </p>
          <p className="text-xs mt-1">
            Last restore: {m?.backup?.lastRestoreCheck ?? "never"} ({m?.backup?.lastRestoreStatus ?? "—"})
            {m?.backup?.restoreUnverified ? " — unverified" : ""}
          </p>
        </div>
        <div className="dmx-card p-4" data-testid="system-tracking-email">
          <h2 className="text-sm font-medium mb-2">Tracking & email</h2>
          <p className="text-xs">Tracking: {m?.tracking?.status ?? "—"} — {m?.tracking?.detail ?? "—"}</p>
          <p className="text-xs mt-1">Email: {m?.email?.status ?? "—"} — {m?.email?.detail ?? "—"}</p>
        </div>
      </section>
    </div>
  );
}
