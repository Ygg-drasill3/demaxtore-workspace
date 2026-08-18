import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OPERATIONAL_ISSUE_CATEGORY_LABELS } from "@dmx/contracts/operational-issue";
import type { OperationalIssueDto } from "@dmx/contracts/operational-issue";
import { toast } from "@/store/toast.store";
import { issueApi } from "../lib/issue.api";
import { issueKeys } from "../lib/issue.query-keys";

function severityClass(s: string) {
  if (s === "CRITICAL") return "text-red-700 bg-red-50";
  if (s === "HIGH") return "text-amber-700 bg-amber-50";
  if (s === "MEDIUM") return "text-sky-700 bg-sky-50";
  return "text-zinc-600 bg-zinc-50";
}

export function IssueDrawer({ issueId, onClose }: { issueId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const { data: issue, isLoading, isError, refetch } = useQuery({
    queryKey: issueKeys.detail(issueId),
    queryFn: () => issueApi.get(issueId),
  });

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      void qc.invalidateQueries({ queryKey: issueKeys.all });
      toast.success(label);
    } catch {
      toast.error(`${label} failed`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-label="Issue details"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl p-4 space-y-4"
        data-testid="issue-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">Operational Issue</h2>
          <button type="button" className="text-sm underline" onClick={onClose} aria-label="Close issue drawer">
            Close
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : isError || !issue ? (
          <div className="space-y-2">
            <p className="text-sm text-red-600">Failed to load issue.</p>
            <button type="button" className="text-sm underline" onClick={() => void refetch()}>Retry</button>
          </div>
        ) : (
          <>
            <IssueSummary issue={issue} />
            {issue.description && (
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{issue.description}</p>
            )}
            {issue.resolutionSuggested && issue.status !== "RESOLVED" && issue.status !== "CLOSED" && (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" data-testid="issue-resolution-suggested">
                Linked task completed — resolution suggested (issue not auto-closed).
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {issue.permissions.canResolve && issue.status !== "RESOLVED" && issue.status !== "CLOSED" && (
                <button
                  type="button"
                  disabled={busy}
                  className="dmx-btn-primary text-sm"
                  data-testid="issue-resolve"
                  onClick={() =>
                    void run("Issue resolved", () =>
                      issueApi.resolve(issue.id, { resolutionNote: note || null }),
                    )
                  }
                >
                  Resolve
                </button>
              )}
              {issue.permissions.canClose && issue.status === "RESOLVED" && (
                <button
                  type="button"
                  disabled={busy}
                  className="dmx-btn-secondary text-sm"
                  onClick={() =>
                    void run("Issue closed", () =>
                      issueApi.resolve(issue.id, { close: true, resolutionNote: note || null }),
                    )
                  }
                >
                  Close
                </button>
              )}
              {issue.permissions.canReopen && (issue.status === "RESOLVED" || issue.status === "CLOSED") && (
                <button
                  type="button"
                  disabled={busy}
                  className="text-sm underline"
                  data-testid="issue-reopen"
                  onClick={() => void run("Issue reopened", () => issueApi.reopen(issue.id))}
                >
                  Reopen
                </button>
              )}
              <Link className="text-sm underline" to={`/workspace/order/${issue.orderId}`}>Open Order</Link>
            </div>

            {issue.permissions.canResolve && issue.status !== "RESOLVED" && issue.status !== "CLOSED" && (
              <label className="block text-xs space-y-1">
                <span className="text-zinc-500">Resolution note</span>
                <textarea
                  aria-label="Resolution note"
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function IssueSummary({ issue }: { issue: OperationalIssueDto }) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm" data-testid="issue-summary">
      <div className="col-span-2">
        <dt className="text-xs text-zinc-500">Title</dt>
        <dd className="font-medium">{issue.title}</dd>
      </div>
      <div>
        <dt className="text-xs text-zinc-500">Status</dt>
        <dd>{issue.status}</dd>
      </div>
      <div>
        <dt className="text-xs text-zinc-500">Severity</dt>
        <dd>
          <span className={`rounded px-1.5 py-0.5 text-xs ${severityClass(issue.severity)}`}>
            {issue.severity}
          </span>
        </dd>
      </div>
      <div>
        <dt className="text-xs text-zinc-500">Category</dt>
        <dd>{OPERATIONAL_ISSUE_CATEGORY_LABELS[issue.category] ?? issue.category}</dd>
      </div>
      <div>
        <dt className="text-xs text-zinc-500">Impact</dt>
        <dd data-testid="issue-impact">{issue.impactType?.replace(/_/g, " ") ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs text-zinc-500">Owner</dt>
        <dd data-testid="issue-owner">{issue.ownerRole ?? "—"}</dd>
      </div>
      {issue.recommendedAction && (
        <div className="col-span-2">
          <dt className="text-xs text-zinc-500">Recommended action</dt>
          <dd className="rounded border border-sky-200 bg-sky-50 px-2 py-1.5 text-sky-900" data-testid="issue-recommended-action">
            {issue.recommendedAction}
          </dd>
        </div>
      )}
      <div>
        <dt className="text-xs text-zinc-500">Related</dt>
        <dd>{issue.relatedEntityType ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs text-zinc-500">Source event</dt>
        <dd className="text-xs font-mono text-zinc-600">{issue.sourceEventType ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs text-zinc-500">Reported by</dt>
        <dd>{issue.reportedBy.name}</dd>
      </div>
      <div>
        <dt className="text-xs text-zinc-500">Resolved</dt>
        <dd>{issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleString() : "—"}</dd>
      </div>
    </dl>
  );
}
