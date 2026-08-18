import { useState } from "react";
import { Link } from "react-router-dom";
import type { McOrganizationWorkspaceDTO } from "@dmx/contracts/mixed-container-organization";
import {
  ORGANIZATION_PROGRESS_STEPS,
  ORGANIZATION_STATUS_LABELS,
  isOrganizationStepComplete,
  type OrganizationStatus,
} from "@dmx/contracts/mixed-container-organization";
import { Button } from "@/components/ui/Button";

type Props = {
  data: McOrganizationWorkspaceDTO;
  isAdmin?: boolean;
  onUpdateStatus?: (status: string, note?: string) => Promise<void>;
  onAssignManager?: (managerId: string) => Promise<void>;
  onAddInternalNote?: (body: string) => Promise<void>;
  managers?: Array<{ id: string; displayName: string }>;
  submitting?: boolean;
};

export function OrganizationWorkspaceView({
  data,
  isAdmin = false,
  onUpdateStatus,
  onAssignManager,
  onAddInternalNote,
  managers = [],
  submitting = false,
}: Props) {
  const current = data.organizationStatus as OrganizationStatus;

  return (
    <div data-testid="mc-organization-workspace" className="space-y-6">
      <header className="dmx-card p-5" data-testid="mc-org-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Organization Workspace</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-1" data-testid="mc-org-ref">
              {data.organizationRef}
            </h1>
            <p className="text-sm text-zinc-600 mt-2">
              {data.buyerName}
              {data.buyerOrgName ? ` · ${data.buyerOrgName}` : ""}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-accent-50 text-accent-900 border border-accent-100" data-testid="mc-org-status">
              {ORGANIZATION_STATUS_LABELS[current]}
            </span>
            {data.organizationStartedAt && (
              <p className="text-xs text-zinc-500 mt-2">Started {new Date(data.organizationStartedAt).toLocaleString()}</p>
            )}
            <p className="text-[10px] text-zinc-400 mt-1" data-testid="mc-org-sync-status">
              Sync: {data.synchronizationStatus}
              {data.lastSyncedAt ? ` · ${new Date(data.lastSyncedAt).toLocaleString()}` : ""}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-sm">
          <div>
            <dt className="text-xs uppercase text-zinc-500">Procurement request</dt>
            <dd className="font-medium mt-1">{data.procurementRequestRef ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Commercial proposal</dt>
            <dd className="font-medium mt-1">{data.commercialProposalRef ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Destination</dt>
            <dd className="font-medium mt-1">{data.destinationPort ?? data.destinationCountry ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Operations manager</dt>
            <dd className="font-medium mt-1" data-testid="mc-org-ops-manager">{data.assignedOperationsManagerName ?? "Unassigned"}</dd>
          </div>
        </dl>
      </header>

      <div className="dmx-card p-5" data-testid="mc-org-progress">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-medium">Execution Progress</h2>
          <span className="text-2xl font-display font-semibold" data-testid="mc-org-completion">{data.executionProgressPercent}%</span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden mb-5">
          <div className="h-full bg-accent-900 rounded-full transition-all" style={{ width: `${data.executionProgressPercent}%` }} />
        </div>
        <ol className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0 overflow-x-auto">
          {ORGANIZATION_PROGRESS_STEPS.map((step, idx) => {
            const done = isOrganizationStepComplete(step.key, current);
            const active = current === step.key;
            return (
              <li key={step.key} className="flex md:flex-1 items-center gap-2 shrink-0">
                <span className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${done ? "bg-green-600 text-white" : active ? "bg-accent-900 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                  {idx + 1}
                </span>
                <span className={`text-xs ${done || active ? "text-zinc-900 font-medium" : "text-zinc-500"}`}>{step.label}</span>
                {idx < ORGANIZATION_PROGRESS_STEPS.length - 1 && <span className="hidden md:block flex-1 h-px bg-zinc-200 mx-1" />}
              </li>
            );
          })}
        </ol>
      </div>

      <section className="dmx-card p-5" data-testid="mc-org-modules">
        <h2 className="font-medium mb-4">Workspace Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.modules.map((mod) => (
            <div key={mod.key} data-testid={`mc-org-module-${mod.key}`} className="border border-zinc-100 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-medium text-sm">{mod.label}</h3>
                <span className="text-xs text-zinc-500">{mod.status}</span>
              </div>
              <p className="text-xs text-zinc-500">{mod.responsibleTeam}</p>
              {mod.lastActivity && (
                <p className="text-xs text-zinc-600" data-testid={`mc-org-module-activity-${mod.key}`}>{mod.lastActivity}</p>
              )}
              {mod.lastUpdate && (
                <p className="text-[10px] text-zinc-400">Updated {new Date(mod.lastUpdate).toLocaleString()}</p>
              )}
              {mod.workspaceUrl && (
                <Link to={mod.workspaceUrl} className="inline-block">
                  <Button size="sm" variant="secondary" data-testid={`mc-org-open-${mod.key}`}>Open Workspace</Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="dmx-card p-5" data-testid="mc-org-tasks">
          <h2 className="font-medium mb-3">Outstanding Tasks</h2>
          {data.outstandingTasks.length === 0 ? (
            <p className="text-sm text-zinc-500">No outstanding tasks.</p>
          ) : (
            <ul className="space-y-2">
              {data.outstandingTasks.map((task) => (
                <li key={task.id} className="text-sm flex justify-between border-t border-zinc-100 pt-2 first:border-0 first:pt-0">
                  <span>{task.title}</span>
                  <span className={`text-xs uppercase ${task.priority === "HIGH" ? "text-amber-700" : "text-zinc-400"}`}>{task.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dmx-card p-5" data-testid="mc-org-milestones">
          <h2 className="font-medium mb-3">Upcoming Milestones</h2>
          <ul className="space-y-2 text-sm">
            {data.upcomingMilestones.map((m) => (
              <li key={m.key} className="border-t border-zinc-100 pt-2 first:border-0 first:pt-0">{m.label}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="dmx-card p-5" data-testid="mc-org-teams">
        <h2 className="font-medium mb-3">Responsible Teams</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {data.responsibleTeams.map((t) => (
            <li key={t.team} className="border border-zinc-100 rounded p-3">
              <p className="font-medium">{t.team}</p>
              <p className="text-xs text-zinc-500 mt-1">{t.role}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="dmx-card p-5" data-testid="mc-org-activity">
        <h2 className="font-medium mb-3">Activity Timeline</h2>
        {data.activityTimeline.length === 0 ? (
          <p className="text-sm text-zinc-500">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.activityTimeline.map((item) => (
              <li key={item.id} className="flex gap-3 text-sm border-l-2 border-zinc-100 pl-3" data-testid={`mc-org-timeline-${item.eventType}`}>
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-zinc-500">
                    {item.sourceModule.replace(/_/g, " ")}
                    {item.actorName ? ` · ${item.actorName}` : ""}
                    {" · "}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && (
        <section className="dmx-card p-5" data-testid="mc-org-sync-panel">
          <h2 className="font-medium mb-2">Synchronization Status</h2>
          <p className="text-sm text-zinc-600">
            Module events are synchronized automatically. Status: <strong>{data.synchronizationStatus}</strong>
            {data.lastSyncedAt && <> · Last event {new Date(data.lastSyncedAt).toLocaleString()}</>}
          </p>
          <p className="text-xs text-zinc-500 mt-2">{data.activityTimeline.length} timeline events recorded (immutable).</p>
        </section>
      )}

      {isAdmin && onUpdateStatus && (
        <AdminOrganizationActions
          currentStatus={current}
          onUpdateStatus={onUpdateStatus}
          onAssignManager={onAssignManager}
          onAddInternalNote={onAddInternalNote}
          managers={managers}
          internalNotes={data.internalNotes}
          submitting={submitting}
        />
      )}
    </div>
  );
}

function AdminOrganizationActions({
  currentStatus,
  onUpdateStatus,
  onAssignManager,
  onAddInternalNote,
  managers,
  internalNotes,
  submitting,
}: {
  currentStatus: OrganizationStatus;
  onUpdateStatus: (status: string, note?: string) => Promise<void>;
  onAssignManager?: (managerId: string) => Promise<void>;
  onAddInternalNote?: (body: string) => Promise<void>;
  managers: Array<{ id: string; displayName: string }>;
  internalNotes?: Array<{ id: string; authorName: string; body: string; createdAt: string }>;
  submitting: boolean;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [managerId, setManagerId] = useState("");
  const [internalNote, setInternalNote] = useState("");

  return (
    <section className="dmx-card p-5 space-y-4" data-testid="mc-org-admin-actions">
      <h2 className="font-medium">Operations Actions</h2>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-sm block">
          <span className="text-xs uppercase text-zinc-500 block mb-1">Update status</span>
          <select className="h-9 border rounded px-2 text-sm min-w-[220px]" value={status} onChange={(e) => setStatus(e.target.value as OrganizationStatus)} data-testid="mc-org-status-select">
            {ORGANIZATION_PROGRESS_STEPS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </label>
        <input className="h-9 border rounded px-2 text-sm flex-1 min-w-[200px]" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} data-testid="mc-org-status-note" />
        <Button data-testid="mc-org-update-status" disabled={submitting} onClick={() => void onUpdateStatus(status, note || undefined)}>Update Status</Button>
      </div>
      {onAssignManager && (
        <div className="flex flex-wrap gap-3 items-end">
          <select className="h-9 border rounded px-2 text-sm min-w-[200px]" value={managerId} onChange={(e) => setManagerId(e.target.value)} data-testid="mc-org-assign-manager-select">
            <option value="">Select operations manager</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
          </select>
          <Button variant="secondary" data-testid="mc-org-assign-manager" disabled={!managerId || submitting} onClick={() => void onAssignManager(managerId)}>Assign Manager</Button>
        </div>
      )}
      {onAddInternalNote && (
        <div className="space-y-2">
          <textarea className="w-full min-h-[80px] border rounded p-2 text-sm" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} data-testid="mc-org-internal-note-input" />
          <Button variant="secondary" data-testid="mc-org-add-internal-note" disabled={!internalNote.trim() || submitting} onClick={() => void onAddInternalNote(internalNote.trim()).then(() => setInternalNote(""))}>Add Internal Note</Button>
        </div>
      )}
      {internalNotes && internalNotes.length > 0 && (
        <div data-testid="mc-org-internal-notes">
          <h3 className="text-sm font-medium mb-2">Internal Notes</h3>
          <ul className="space-y-2 text-sm">
            {internalNotes.map((n) => (
              <li key={n.id} className="border-t border-zinc-100 pt-2">
                <p>{n.body}</p>
                <p className="text-xs text-zinc-500 mt-1">{n.authorName} · {new Date(n.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
