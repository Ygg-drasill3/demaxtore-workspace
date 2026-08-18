import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ShipmentMilestoneDto, ShipmentMilestoneSummaryDto } from "@dmx/contracts/shipment-milestones";
import { shipmentApi } from "../lib/shipment.api";
import { shipmentKeys } from "../lib/shipment.query-keys";
import { toast } from "@/store/toast.store";

function formatDelay(mins: number | null): string {
  if (mins == null) return "—";
  if (mins === 0) return "On time";
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const body = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return mins > 0 ? `+${body}` : `−${body}`;
}

function riskClass(risk: string): string {
  if (risk === "DELAYED") return "text-red-700 bg-red-50";
  if (risk === "AT_RISK") return "text-amber-700 bg-amber-50";
  return "text-emerald-700 bg-emerald-50";
}

export function ShipmentMilestonesPanel({
  shipmentId,
  milestones,
  summary,
}: {
  shipmentId: string;
  milestones: ShipmentMilestoneDto[];
  summary?: ShipmentMilestoneSummaryDto | null;
}) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [etaDraft, setEtaDraft] = useState<Record<string, string>>({});

  async function refresh() {
    await qc.invalidateQueries({ queryKey: shipmentKeys.detail(shipmentId) });
  }

  async function complete(m: ShipmentMilestoneDto) {
    setBusyId(m.id);
    try {
      await shipmentApi.completeMilestone(shipmentId, m.id);
      toast.success(`${m.label} completed`);
      await refresh();
    } catch {
      toast.error("Could not complete milestone");
    } finally {
      setBusyId(null);
    }
  }

  async function saveEta(m: ShipmentMilestoneDto) {
    const raw = etaDraft[m.id];
    if (!raw) return;
    setBusyId(m.id);
    try {
      await shipmentApi.patchMilestone(shipmentId, m.id, {
        estimatedAt: new Date(raw).toISOString(),
      });
      toast.success("ETA updated");
      await refresh();
    } catch {
      toast.error("Could not update ETA");
    } finally {
      setBusyId(null);
    }
  }

  if (!milestones.length) {
    return (
      <section data-testid="shipment-milestones" className="dmx-card p-4">
        <h2 className="font-medium mb-2">Milestones</h2>
        <p className="text-sm text-zinc-500" data-testid="shipment-milestones-empty">No milestones.</p>
      </section>
    );
  }

  const completed = summary?.progressCompleted ?? milestones.filter((m) => m.status === "COMPLETED").length;
  const total = summary?.progressTotal ?? milestones.filter((m) => m.status !== "SKIPPED").length;
  const current = summary?.current ?? milestones.find((m) => m.status === "ACTIVE") ?? null;

  return (
    <section data-testid="shipment-milestones" className="dmx-card p-4 space-y-4" aria-label="Shipping milestones">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">Milestones</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Current: {current?.label ?? "—"} · Progress {completed}/{total}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`rounded px-2 py-1 ${riskClass(summary?.overallRisk ?? "ON_TRACK")}`} data-testid="shipment-milestone-risk">
            {summary?.overallRisk ?? "ON_TRACK"}
          </span>
          <span className="rounded bg-zinc-50 px-2 py-1 text-zinc-700" data-testid="shipment-milestone-delay">
            Delay: {formatDelay(summary?.overallDelayMinutes ?? null)}
          </span>
          <span className="rounded bg-zinc-50 px-2 py-1 text-zinc-700" data-testid="shipment-milestone-eta">
            ETA: {summary?.eta ? new Date(summary.eta).toLocaleString() : "—"}
          </span>
        </div>
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm" data-testid="shipment-milestones-table">
          <thead>
            <tr className="text-left text-xs text-zinc-500 border-b">
              <th className="py-2 pr-2">Milestone</th>
              <th className="py-2 pr-2">Planned</th>
              <th className="py-2 pr-2">ETA</th>
              <th className="py-2 pr-2">Actual</th>
              <th className="py-2 pr-2">Delay</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {milestones.filter((m) => m.status !== "SKIPPED").map((m) => (
              <tr
                key={m.id}
                data-testid={`shipment-milestone-${m.key}`}
                data-status={m.status}
                data-risk={m.risk}
                className="border-b border-zinc-50 align-top"
              >
                <td className="py-2 pr-2 font-medium">{m.label}</td>
                <td className="py-2 pr-2 text-zinc-600">{m.plannedAt ? new Date(m.plannedAt).toLocaleString() : "—"}</td>
                <td className="py-2 pr-2 text-zinc-600">
                  {m.estimatedAt ? new Date(m.estimatedAt).toLocaleString() : "—"}
                  {m.permissions.canUpdate && m.status !== "COMPLETED" && (
                    <div className="mt-1 flex gap-1">
                      <input
                        type="datetime-local"
                        aria-label={`ETA for ${m.label}`}
                        className="rounded border px-1 py-0.5 text-xs"
                        value={etaDraft[m.id] ?? ""}
                        onChange={(e) => setEtaDraft((s) => ({ ...s, [m.id]: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="text-xs underline"
                        disabled={busyId === m.id}
                        data-testid={`milestone-save-eta-${m.key}`}
                        onClick={() => void saveEta(m)}
                      >
                        Save
                      </button>
                    </div>
                  )}
                </td>
                <td className="py-2 pr-2 text-zinc-600">{m.actualAt ? new Date(m.actualAt).toLocaleString() : "—"}</td>
                <td className="py-2 pr-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${riskClass(m.risk)}`} data-testid={`milestone-delay-${m.key}`}>
                    {formatDelay(m.delayMinutes)}
                  </span>
                </td>
                <td className="py-2 pr-2 text-xs uppercase tracking-wide text-zinc-500">{m.status}</td>
                <td className="py-2">
                  {m.permissions.canComplete && (m.status === "ACTIVE" || m.status === "PENDING") && (
                    <button
                      type="button"
                      className="dmx-btn-secondary text-xs"
                      disabled={busyId === m.id}
                      data-testid={`milestone-complete-${m.key}`}
                      onClick={() => void complete(m)}
                    >
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="sm:hidden space-y-2">
        {milestones.filter((m) => m.status !== "SKIPPED").map((m) => (
          <li
            key={m.id}
            data-testid={`shipment-milestone-card-${m.key}`}
            className="rounded-xl border border-zinc-100 px-3 py-2 text-sm space-y-1"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{m.label}</p>
              <span className="text-[11px] uppercase text-zinc-500">{m.status}</span>
            </div>
            <p className="text-xs text-zinc-500">
              Planned: {m.plannedAt ? new Date(m.plannedAt).toLocaleString() : "—"}
              {" · "}ETA: {m.estimatedAt ? new Date(m.estimatedAt).toLocaleString() : "—"}
              {" · "}Actual: {m.actualAt ? new Date(m.actualAt).toLocaleString() : "—"}
            </p>
            <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${riskClass(m.risk)}`}>
              {formatDelay(m.delayMinutes)} · {m.risk}
            </span>
            {m.permissions.canComplete && (m.status === "ACTIVE" || m.status === "PENDING") && (
              <button
                type="button"
                className="dmx-btn-secondary text-xs mt-1"
                disabled={busyId === m.id}
                onClick={() => void complete(m)}
              >
                Complete
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
