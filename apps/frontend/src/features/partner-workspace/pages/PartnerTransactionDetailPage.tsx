import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { partnerApi } from "../lib/partner.api";
import { toast } from "@/store/toast.store";
import { PartnerShipmentCustomsLink } from "../components/PartnerShipmentCustomsLink";
import { PartnerShipmentInlandLink } from "../components/PartnerShipmentInlandLink";

export default function PartnerTransactionDetailPage() {
  const { workspaceId = "" } = useParams();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["partner", "transaction", workspaceId],
    queryFn: () => partnerApi.getTransaction(workspaceId),
    enabled: !!workspaceId,
  });

  const completeTask = useMutation({
    mutationFn: (taskId: string) => partnerApi.completeTask(taskId),
    onSuccess: () => {
      toast.success("Task completed");
      void qc.invalidateQueries({ queryKey: ["partner"] });
    },
    onError: () => toast.error("Could not complete task"),
  });

  const cargoReady = useMutation({
    mutationFn: () => partnerApi.confirmCargoReady(workspaceId),
    onSuccess: () => {
      toast.success("Cargo ready confirmed");
      void qc.invalidateQueries({ queryKey: ["partner"] });
    },
    onError: () => toast.error("Action failed"),
  });

  const gateIn = useMutation({
    mutationFn: () => partnerApi.confirmGateIn(workspaceId),
    onSuccess: () => {
      toast.success("Gate-in confirmed");
      void qc.invalidateQueries({ queryKey: ["partner"] });
    },
    onError: () => toast.error("Action failed"),
  });

  if (isLoading) return <p className="p-6 text-sm text-zinc-500">Loading…</p>;
  if (isError || !data) {
    return (
      <div className="p-6 space-y-2">
        <p className="text-sm text-red-600">Unable to load transaction (forbidden or missing).</p>
        <button type="button" className="text-sm underline" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  const po = data.summary.po as
    | { poNumber?: string; status?: string; lines?: Array<{ description: string; quantity: number }> }
    | undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6" data-testid="partner-transaction-detail">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {data.workspaceType} · {data.partnerRole.replace(/_/g, " ")}
        </p>
        <h1 className="text-2xl font-semibold">{data.externalRef}</h1>
        <p className="text-sm text-zinc-600">{data.state}</p>
      </header>

      <section className="rounded-lg border p-3 text-sm space-y-1" data-testid="partner-summary">
        <h2 className="font-medium mb-2">Summary</h2>
        {po && (
          <p>
            PO {po.poNumber} · {po.status}
            {po.lines?.length ? ` · ${po.lines.length} line(s)` : ""}
          </p>
        )}
        {typeof data.summary.pol === "string" && (
          <p>
            {String(data.summary.pol)} → {String(data.summary.pod ?? "—")}
          </p>
        )}
        {typeof data.summary.bookingReference === "string" && (
          <p>Booking {String(data.summary.bookingReference)} · {String(data.summary.carrierName ?? "")}</p>
        )}
        {(typeof data.summary.siCutoff === "string" || typeof data.summary.cyCutoff === "string") && (
          <p className="text-xs text-zinc-500">
            Cut-offs: SI {data.summary.siCutoff ? new Date(String(data.summary.siCutoff)).toLocaleString() : "—"}
            {" · "}
            CY {data.summary.cyCutoff ? new Date(String(data.summary.cyCutoff)).toLocaleString() : "—"}
          </p>
        )}
      </section>

      <PartnerShipmentCustomsLink workspaceId={data.workspaceId} partnerRole={data.partnerRole} />
      <PartnerShipmentInlandLink workspaceId={data.workspaceId} partnerRole={data.partnerRole} />

      <section className="space-y-2" data-testid="partner-allowed-actions">
        <h2 className="text-lg font-medium">Allowed actions</h2>
        <div className="flex flex-wrap gap-2">
          {data.allowedActions.includes("confirm-cargo-ready") && (
            <button
              type="button"
              className="dmx-btn-primary text-sm"
              disabled={cargoReady.isPending}
              onClick={() => cargoReady.mutate()}
              data-testid="partner-confirm-cargo-ready"
            >
              Confirm cargo ready
            </button>
          )}
          {data.allowedActions.includes("confirm-gate-in") && (
            <button
              type="button"
              className="dmx-btn-primary text-sm"
              disabled={gateIn.isPending}
              onClick={() => gateIn.mutate()}
              data-testid="partner-confirm-gate-in"
            >
              Confirm gate-in
            </button>
          )}
          {data.allowedActions.length === 0 && (
            <p className="text-sm text-zinc-500">No role actions for this transaction.</p>
          )}
        </div>
      </section>

      <section className="space-y-2" data-testid="partner-tasks">
        <h2 className="text-lg font-medium">Assigned tasks</h2>
        {data.tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">No tasks.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {data.tasks.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-zinc-500">{t.status} · {t.priority}</p>
                  {t.description && <p className="text-xs text-zinc-600 mt-1">{t.description}</p>}
                </div>
                {t.canComplete && (
                  <button
                    type="button"
                    className="dmx-btn-secondary text-xs"
                    disabled={completeTask.isPending}
                    onClick={() => completeTask.mutate(t.id)}
                    data-testid={`partner-complete-task-${t.id}`}
                  >
                    Complete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.issues.length > 0 && (
        <section className="space-y-2" data-testid="partner-issues">
          <h2 className="text-lg font-medium">Needs attention</h2>
          <ul className="space-y-2">
            {data.issues.map((i) => (
              <li key={i.id} className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <p className="font-medium">{i.title}</p>
                {i.recommendedAction && (
                  <p className="text-xs text-amber-900 mt-1">{i.recommendedAction}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2" data-testid="partner-documents">
        <h2 className="text-lg font-medium">Documents</h2>
        {data.documents.length === 0 ? (
          <p className="text-sm text-zinc-500">No documents in scope.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {data.documents.map((d) => (
              <li key={d.id} className="px-3 py-2 flex justify-between">
                <span>{d.documentType}</span>
                <span className="text-zinc-500">{d.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
