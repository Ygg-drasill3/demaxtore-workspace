import { useCallback, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CommercialDocumentCategory } from "@dmx/contracts/commercial-document";
import { CommercialDocumentCenter } from "@/features/purchase-order/components/CommercialDocumentCenter/CommercialDocumentCenter";
import { toast } from "@/store/toast.store";
import { inspectionApi } from "../lib/inspection.api";
import { inspectionKeys } from "../lib/inspection.query-keys";

const INSPECTION_DOC_CATEGORIES: CommercialDocumentCategory[] = [
  "INSPECTION_REPORT",
  "CERTIFICATE_OF_ORIGIN",
  "OTHER",
];

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-900 truncate">{value ?? "—"}</dd>
    </div>
  );
}

export default function InspectionWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [findingForm, setFindingForm] = useState({
    category: "",
    severity: "MINOR",
    description: "",
  });
  const [assignForm, setAssignForm] = useState({
    inspectorName: "",
    inspectorOrg: "",
    inspectorContact: "",
  });
  const [ncrReason, setNcrReason] = useState("");
  const [decision, setDecision] = useState("PASS");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: inspectionKeys.detail(id!),
    queryFn: () => inspectionApi.get(id!),
    enabled: !!id,
  });

  const { data: timeline } = useQuery({
    queryKey: inspectionKeys.timeline(id!),
    queryFn: () => inspectionApi.timeline(id!),
    enabled: !!id,
  });

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: inspectionKeys.detail(id!) });
    void qc.invalidateQueries({ queryKey: inspectionKeys.timeline(id!) });
    void qc.invalidateQueries({ queryKey: inspectionKeys.findings(id!) });
    void qc.invalidateQueries({ queryKey: inspectionKeys.documents(id!) });
  }, [qc, id]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      refresh();
      toast.success(label);
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "response" in e
        ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? label + " failed")
        : `${label} failed`;
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <div data-testid="inspection-loading" className="p-6 text-sm text-zinc-500">Loading inspection…</div>;
  }
  if (isError || !data) {
    return (
      <div className="p-6 space-y-2" data-testid="inspection-error">
        <p className="text-sm text-red-600">Failed to load inspection workspace.</p>
        <button type="button" className="text-sm underline" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  const locked = data.decisionLocked || data.summary.status === "APPROVED";
  const perms = data.permissions;
  const poId = data.purchaseOrder?.purchaseOrderId ?? data.summary.purchaseOrderId;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6" data-testid="inspection-workspace">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Inspection Workspace</p>
        <h1 className="text-2xl font-semibold text-zinc-900">{data.summary.inspectionNumber}</h1>
        <p className="text-sm text-zinc-600">
          {data.summary.inspectionType.replaceAll("_", " ")} · {data.summary.status}
          {data.summary.decision ? ` · ${data.summary.decision}` : ""}
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link className="underline" to={`/workspace/order/${data.orderWorkspaceId}`}>
            Open Order Workspace
          </Link>
          <Link
            className="underline"
            data-testid="inspection-request-freight"
            to={`/workspace/order/${data.orderWorkspaceId}#order-freightiq-section`}
          >
            {String(data.summary.decision ?? "").toUpperCase().includes("PASS") ||
            data.summary.status === "APPROVED"
              ? "Request Freight"
              : "Open FreightIQ"}
          </Link>
          {data.shipment && (
            <Link
              className="underline"
              data-testid="inspection-open-shipment"
              to={`/workspace/shipment/${data.shipment.shipmentWorkspaceId}`}
            >
              Open Shipment Workspace
            </Link>
          )}
          {poId && (
            <Link className="underline" to={`/workspace/po/${poId}`}>
              Open Purchase Order
            </Link>
          )}
        </div>
      </header>

      <section className="dmx-card p-4 space-y-3" data-testid="inspection-summary" aria-label="Inspection summary">
        <h2 className="text-sm font-semibold">Summary</h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Status" value={data.summary.status} />
          <Field label="Inspector" value={data.summary.inspector} />
          <Field label="Company" value={data.summary.inspectionCompany} />
          <Field label="Factory" value={data.summary.factory} />
          <Field label="PO" value={data.summary.purchaseOrderNumber} />
          <Field label="Shipment" value={data.summary.shipmentNumber} />
          <Field label="Planned" value={data.summary.plannedDate ? new Date(data.summary.plannedDate).toLocaleString() : null} />
          <Field label="Actual" value={data.summary.actualDate ? new Date(data.summary.actualDate).toLocaleString() : null} />
          <Field label="Decision" value={data.summary.decision} />
          <Field label="Findings" value={data.summary.findingCount} />
          <Field label="Defects" value={data.summary.defectCount} />
          <Field label="NCRs" value={data.summary.ncrCount} />
        </dl>
      </section>

      <section className="dmx-card p-4 space-y-3" data-testid="inspection-request">
        <h2 className="text-sm font-semibold">Request</h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Request #" value={data.request.requestNumber} />
          <Field label="Requested" value={data.request.requestedAt ? new Date(data.request.requestedAt).toLocaleString() : null} />
          <Field label="Supplier" value={data.request.supplier} />
          <Field label="Factory" value={data.request.factory} />
        </dl>
        {perms.canEditRequest && !locked && (
          <button
            type="button"
            disabled={busy}
            className="text-sm text-red-700 underline"
            data-testid="inspection-cancel-request"
            onClick={() => void run("Inspection cancelled", () => inspectionApi.cancel(id!))}
          >
            Cancel request
          </button>
        )}
      </section>

      <section className="dmx-card p-4 space-y-3" data-testid="inspection-assignment">
        <h2 className="text-sm font-semibold">Assignment</h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Inspector" value={data.assignment.inspector} />
          <Field label="Organization" value={data.assignment.organization} />
          <Field label="Contact" value={data.assignment.contact} />
          <Field label="Assigned" value={data.assignment.assignedAt ? new Date(data.assignment.assignedAt).toLocaleString() : null} />
        </dl>
        {perms.canAssign && !locked && (
          <form
            className="grid gap-2 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run("Inspector assigned", () =>
                inspectionApi.assign(id!, {
                  inspectorName: assignForm.inspectorName,
                  inspectorOrg: assignForm.inspectorOrg || null,
                  inspectorContact: assignForm.inspectorContact || null,
                }),
              );
            }}
          >
            <input
              required
              aria-label="Inspector name"
              data-testid="inspection-assign-name"
              className="rounded border px-2 py-1.5 text-sm"
              placeholder="Inspector"
              value={assignForm.inspectorName}
              onChange={(e) => setAssignForm((s) => ({ ...s, inspectorName: e.target.value }))}
            />
            <input
              aria-label="Inspector organization"
              className="rounded border px-2 py-1.5 text-sm"
              placeholder="Organization"
              value={assignForm.inspectorOrg}
              onChange={(e) => setAssignForm((s) => ({ ...s, inspectorOrg: e.target.value }))}
            />
            <input
              aria-label="Inspector contact"
              className="rounded border px-2 py-1.5 text-sm"
              placeholder="Contact"
              value={assignForm.inspectorContact}
              onChange={(e) => setAssignForm((s) => ({ ...s, inspectorContact: e.target.value }))}
            />
            <button type="submit" disabled={busy} className="dmx-btn-primary text-sm" data-testid="inspection-assign-submit">
              Assign
            </button>
          </form>
        )}
      </section>

      <section className="dmx-card p-4 space-y-3" data-testid="inspection-schedule">
        <h2 className="text-sm font-semibold">Schedule</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Planned" value={data.schedule.plannedDate ? new Date(data.schedule.plannedDate).toLocaleString() : null} />
          <Field label="Start" value={data.schedule.actualStart ? new Date(data.schedule.actualStart).toLocaleString() : null} />
          <Field label="Finish" value={data.schedule.actualFinish ? new Date(data.schedule.actualFinish).toLocaleString() : null} />
          <Field label="Duration (h)" value={data.schedule.durationHours} />
        </dl>
        {perms.canSchedule && !locked && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="dmx-btn-secondary text-sm"
              data-testid="inspection-schedule-btn"
              onClick={() =>
                void run("Inspection scheduled", () =>
                  inspectionApi.schedule(id!, {
                    plannedDate: new Date(Date.now() + 864e5).toISOString(),
                  }),
                )
              }
            >
              Schedule (+1 day)
            </button>
            <button
              type="button"
              disabled={busy}
              className="dmx-btn-secondary text-sm"
              data-testid="inspection-start-btn"
              onClick={() =>
                void run("Inspection started", () =>
                  inspectionApi.schedule(id!, { actualStartAt: new Date().toISOString() }),
                )
              }
            >
              Mark started
            </button>
            <button
              type="button"
              disabled={busy}
              className="dmx-btn-secondary text-sm"
              data-testid="inspection-complete-btn"
              onClick={() =>
                void run("Inspection completed", () =>
                  inspectionApi.schedule(id!, {
                    actualFinishAt: new Date().toISOString(),
                  }),
                )
              }
            >
              Mark completed
            </button>
          </div>
        )}
      </section>

      <section className="dmx-card p-4 space-y-3" data-testid="inspection-findings">
        <h2 className="text-sm font-semibold">Findings</h2>
        {data.findings.length === 0 ? (
          <p className="text-sm text-zinc-500">No findings recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="Findings">
              <thead>
                <tr className="text-left text-zinc-500 border-b">
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2">Severity</th>
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2">Qty</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.findings.map((f) => (
                  <tr key={f.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-2">{f.category}</td>
                    <td className="py-2 pr-2">{f.severity}</td>
                    <td className="py-2 pr-2">{f.description}</td>
                    <td className="py-2 pr-2">{f.quantity ?? "—"}</td>
                    <td className="py-2">
                      {f.status}
                      {perms.canManageFindings && !locked && (
                        <button
                          type="button"
                          className="ml-2 text-xs text-red-600 underline"
                          onClick={() =>
                            void run("Finding deleted", () => inspectionApi.deleteFinding(id!, f.id))
                          }
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {perms.canManageFindings && !locked && (
          <form
            className="grid gap-2 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run("Finding added", async () => {
                await inspectionApi.addFinding(id!, findingForm);
                setFindingForm({ category: "", severity: "MINOR", description: "" });
              });
            }}
          >
            <input
              required
              aria-label="Finding category"
              data-testid="inspection-finding-category"
              className="rounded border px-2 py-1.5 text-sm"
              placeholder="Category"
              value={findingForm.category}
              onChange={(e) => setFindingForm((s) => ({ ...s, category: e.target.value }))}
            />
            <select
              aria-label="Finding severity"
              data-testid="inspection-finding-severity"
              className="rounded border px-2 py-1.5 text-sm"
              value={findingForm.severity}
              onChange={(e) => setFindingForm((s) => ({ ...s, severity: e.target.value }))}
            >
              <option value="MINOR">Minor</option>
              <option value="MAJOR">Major</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <input
              required
              aria-label="Finding description"
              data-testid="inspection-finding-description"
              className="rounded border px-2 py-1.5 text-sm"
              placeholder="Description"
              value={findingForm.description}
              onChange={(e) => setFindingForm((s) => ({ ...s, description: e.target.value }))}
            />
            <button type="submit" disabled={busy} className="dmx-btn-primary text-sm" data-testid="inspection-finding-submit">
              Add finding
            </button>
          </form>
        )}
      </section>

      <section className="dmx-card p-4 space-y-3" data-testid="inspection-defects">
        <h2 className="text-sm font-semibold">Defects</h2>
        {data.defects.length === 0 ? (
          <p className="text-sm text-zinc-500">No defects.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.defects.map((d) => (
              <li key={d.id}>
                [{d.severity}] {d.code ? `${d.code} — ` : ""}{d.description} ×{d.quantity}
              </li>
            ))}
          </ul>
        )}
        {perms.canManageFindings && !locked && (
          <button
            type="button"
            disabled={busy}
            className="text-sm underline"
            data-testid="inspection-add-defect"
            onClick={() =>
              void run("Defect added", () =>
                inspectionApi.addDefect(id!, {
                  description: "Cosmetic defect",
                  severity: "MINOR",
                  quantity: 1,
                }),
              )
            }
          >
            Add sample defect
          </button>
        )}
      </section>

      <section className="dmx-card p-4 space-y-3" data-testid="inspection-ncr">
        <h2 className="text-sm font-semibold">NCR</h2>
        {data.ncrs.length === 0 ? (
          <p className="text-sm text-zinc-500">No NCRs.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.ncrs.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{n.ncrNumber}</span>
                <span>{n.status}</span>
                <span className="text-zinc-600">{n.reason}</span>
                {perms.canManageNcr && n.status !== "CLOSED" && (
                  <button
                    type="button"
                    className="underline text-xs"
                    onClick={() =>
                      void run("NCR closed", () => inspectionApi.patchNcr(id!, n.id, { close: true }))
                    }
                  >
                    Close
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {perms.canManageNcr && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run("NCR created", async () => {
                await inspectionApi.addNcr(id!, { reason: ncrReason });
                setNcrReason("");
              });
            }}
          >
            <input
              required
              aria-label="NCR reason"
              data-testid="inspection-ncr-reason"
              className="flex-1 rounded border px-2 py-1.5 text-sm"
              placeholder="NCR reason"
              value={ncrReason}
              onChange={(e) => setNcrReason(e.target.value)}
            />
            <button type="submit" disabled={busy} className="dmx-btn-primary text-sm" data-testid="inspection-ncr-submit">
              Create NCR
            </button>
          </form>
        )}
      </section>

      <section className="dmx-card p-4 space-y-3" data-testid="inspection-decision">
        <h2 className="text-sm font-semibold">Decision</h2>
        <p className="text-sm">
          Current: <strong>{data.decision ?? "—"}</strong>
          {locked ? " (locked)" : ""}
        </p>
        {perms.canDecide && !locked && (
          <div className="flex flex-wrap gap-2 items-center">
            <select
              aria-label="Inspection decision"
              data-testid="inspection-decision-select"
              className="rounded border px-2 py-1.5 text-sm"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              <option value="PASS">Pass</option>
              <option value="CONDITIONAL_PASS">Conditional Pass</option>
              <option value="FAIL">Fail</option>
              <option value="REINSPECTION_REQUIRED">Reinspection Required</option>
            </select>
            <button
              type="button"
              disabled={busy}
              className="dmx-btn-primary text-sm"
              data-testid="inspection-decision-submit"
              onClick={() =>
                void run("Decision recorded", () =>
                  inspectionApi.decision(id!, { decision, approve: true }),
                )
              }
            >
              Record & approve
            </button>
          </div>
        )}
      </section>

      {data.shipment && (
        <section className="dmx-card p-4 space-y-2" data-testid="inspection-shipment">
          <h2 className="text-sm font-semibold">Shipment</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Number" value={data.shipment.shipmentNumber} />
            <Field label="Status" value={data.shipment.status} />
            <Field label="ETD" value={data.shipment.etd ? new Date(data.shipment.etd).toLocaleDateString() : null} />
            <Field label="ETA" value={data.shipment.eta ? new Date(data.shipment.eta).toLocaleDateString() : null} />
          </dl>
        </section>
      )}

      <section className="dmx-card p-4 space-y-3" data-testid="inspection-documents-section">
        <h2 className="text-sm font-semibold">Documents</h2>
        {poId ? (
          <CommercialDocumentCenter
            purchaseOrderId={poId}
            fixedSource="INSPECTION"
            allowedCategories={INSPECTION_DOC_CATEGORIES}
          />
        ) : (
          <p className="text-sm text-zinc-500">No inspection documents.</p>
        )}
      </section>

      <section className="dmx-card p-4 space-y-3" data-testid="inspection-timeline">
        <h2 className="text-sm font-semibold">Timeline</h2>
        {!timeline?.length ? (
          <p className="text-sm text-zinc-500">No inspection events yet.</p>
        ) : (
          <ol className="space-y-2 text-sm">
            {timeline.map((e) => (
              <li key={e.id} className="flex gap-3 border-b border-zinc-100 pb-2">
                <time className="shrink-0 text-xs text-zinc-500 w-40">
                  {new Date(e.createdAt).toLocaleString()}
                </time>
                <span>{e.eventType}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
