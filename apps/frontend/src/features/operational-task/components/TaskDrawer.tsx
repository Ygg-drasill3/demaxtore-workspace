import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CommercialDocumentCenter } from "@/features/purchase-order/components/CommercialDocumentCenter/CommercialDocumentCenter";
import { toast } from "@/store/toast.store";
import type { OperationalTaskDto } from "@dmx/contracts/operational-task";
import { taskApi } from "../lib/task.api";
import { taskKeys } from "../lib/task.query-keys";

export function TaskDrawer({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: task, isLoading, isError, refetch } = useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => taskApi.get(taskId),
  });

  const { data: comments } = useQuery({
    queryKey: taskKeys.comments(taskId),
    queryFn: () => taskApi.comments(taskId),
  });

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      void qc.invalidateQueries({ queryKey: taskKeys.all });
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
      aria-label="Task details"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-xl p-4 space-y-4"
        data-testid="task-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">Task</h2>
          <button type="button" className="text-sm underline" onClick={onClose} aria-label="Close task drawer">
            Close
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : isError || !task ? (
          <div className="space-y-2">
            <p className="text-sm text-red-600">Failed to load task.</p>
            <button type="button" className="text-sm underline" onClick={() => void refetch()}>Retry</button>
          </div>
        ) : (
          <>
            <TaskSummary task={task} />
            {task.description && <p className="text-sm text-zinc-700 whitespace-pre-wrap">{task.description}</p>}

            <div className="flex flex-wrap gap-2">
              {task.permissions.canUpdateProgress && ["OPEN", "ASSIGNED"].includes(task.status) && (
                <button type="button" disabled={busy} className="dmx-btn-secondary text-sm" data-testid="task-start"
                  onClick={() => void run("Task started", () => taskApi.start(task.id))}>
                  Start
                </button>
              )}
              {task.permissions.canComplete && task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
                <button type="button" disabled={busy} className="dmx-btn-primary text-sm" data-testid="task-complete"
                  onClick={() => void run("Task completed", () => taskApi.complete(task.id))}>
                  Complete
                </button>
              )}
              {task.permissions.canCancel && task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
                <button type="button" disabled={busy} className="text-sm text-red-700 underline"
                  onClick={() => void run("Task cancelled", () => taskApi.cancel(task.id))}>
                  Cancel
                </button>
              )}
              <Link className="text-sm underline" to={`/workspace/order/${task.orderId}`}>Open Order</Link>
              {task.relatedEntityType === "SHIPMENT" && task.relatedEntityId && (
                <Link className="text-sm underline" to={`/workspace/shipment/${task.relatedEntityId}`}>Open Shipment</Link>
              )}
              {task.relatedEntityType === "INSPECTION" && task.relatedEntityId && (
                <span className="text-sm text-zinc-600">Inspection linked · open the order for status</span>
              )}
            </div>

            <section aria-label="Comments" className="space-y-2">
              <h3 className="text-sm font-semibold">Comments</h3>
              {!comments?.length ? (
                <p className="text-sm text-zinc-500">No comments.</p>
              ) : (
                <ul className="space-y-2">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded border border-zinc-100 p-2 text-sm">
                      <div className="text-xs text-zinc-500">{c.author.name} · {new Date(c.createdAt).toLocaleString()}</div>
                      <p className="mt-1">{c.message}</p>
                    </li>
                  ))}
                </ul>
              )}
              {task.permissions.canComment && (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run("Comment added", async () => {
                      await taskApi.addComment(task.id, comment);
                      setComment("");
                      void qc.invalidateQueries({ queryKey: taskKeys.comments(task.id) });
                    });
                  }}
                >
                  <input
                    aria-label="Task comment"
                    data-testid="task-comment-input"
                    className="flex-1 rounded border px-2 py-1.5 text-sm"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment"
                    required
                  />
                  <button type="submit" disabled={busy} className="dmx-btn-primary text-sm">Post</button>
                </form>
              )}
            </section>

            <section aria-label="Documents" data-testid="task-documents">
              <h3 className="text-sm font-semibold mb-2">Documents</h3>
              {task.purchaseOrderId ? (
                <CommercialDocumentCenter
                  purchaseOrderId={task.purchaseOrderId}
                  allowedCategories={["BILL_OF_LADING", "PACKING_LIST", "INSPECTION_REPORT", "OTHER"]}
                />
              ) : (
                <p className="text-sm text-zinc-500">No linked purchase order for documents.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function TaskSummary({ task }: { task: OperationalTaskDto }) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm" data-testid="task-summary">
      <div className="col-span-2">
        <dt className="text-xs text-zinc-500">Title</dt>
        <dd className="font-medium">{task.title}</dd>
      </div>
      <div><dt className="text-xs text-zinc-500">Status</dt><dd>{task.status}</dd></div>
      <div><dt className="text-xs text-zinc-500">Priority</dt><dd>{task.priority}</dd></div>
      <div><dt className="text-xs text-zinc-500">Assignee</dt><dd>{task.assignedTo?.name ?? "—"}</dd></div>
      <div><dt className="text-xs text-zinc-500">Due</dt><dd>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}</dd></div>
      <div><dt className="text-xs text-zinc-500">Related</dt><dd>{task.relatedEntityType ?? "—"}</dd></div>
      <div><dt className="text-xs text-zinc-500">Created by</dt><dd>{task.createdBy.name}</dd></div>
    </dl>
  );
}
