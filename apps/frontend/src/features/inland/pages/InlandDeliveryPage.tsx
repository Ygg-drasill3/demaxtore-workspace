import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inlandApi } from "../lib/inland.api";
import { tradeDocumentsApi } from "@/features/trade-documents/lib/trade-documents.api";
import { useAuth } from "@/store/auth.store";
import { toast } from "@/store/toast.store";

export default function InlandDeliveryPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [pickupAt, setPickupAt] = useState("");
  const [note, setNote] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [costCurrency, setCostCurrency] = useState("TRY");
  const [costKind, setCostKind] = useState<"ESTIMATED" | "ACTUAL">("ACTUAL");
  const [podUploading, setPodUploading] = useState(false);
  const [podError, setPodError] = useState<string | null>(null);
  const podInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["inland", "detail", id],
    queryFn: () => inlandApi.get(id!),
    enabled: !!id,
  });

  const { data: events } = useQuery({
    queryKey: ["inland", "events", id],
    queryFn: () => inlandApi.events(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["inland"] });
    void qc.invalidateQueries({ queryKey: ["partner", "home"] });
    void qc.invalidateQueries({ queryKey: ["landed-cost"] });
    void qc.invalidateQueries({ queryKey: ["trade-documents"] });
  };

  const run = useMutation({
    mutationFn: async (action: string) => {
      if (!id) throw new Error("missing id");
      switch (action) {
        case "SYNC_TRUCKER":
          return inlandApi.syncTrucker(id);
        case "SCHEDULE_PICKUP":
          if (!pickupAt) throw new Error("Pickup time required");
          return inlandApi.schedulePickup(id, { pickupAt: new Date(pickupAt).toISOString() });
        case "READY_FOR_PICKUP":
          return inlandApi.readyForPickup(id);
        case "CONFIRM_PICKUP":
          return inlandApi.confirmPickup(id, { note: note || null });
        case "GATE_OUT":
          return inlandApi.gateOut(id, { note: note || null });
        case "IN_TRANSIT":
          return inlandApi.inTransit(id, { note: note || null });
        case "MARK_DELIVERED":
          return inlandApi.markDelivered(id, { note: note || null });
        case "RECORD_COST": {
          const amount = Number(costAmount);
          if (!Number.isFinite(amount) || amount < 0) throw new Error("Valid cost amount required");
          return inlandApi.recordCost(id, {
            amount,
            currency: costCurrency || "TRY",
            kind: costKind,
            source: "MANUAL",
          });
        }
        default:
          throw new Error(action);
      }
    },
    onSuccess: () => {
      toast.success("Updated");
      invalidate();
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { error?: string | { message?: string } } } })?.response?.data
          ?.error;
      const text = typeof msg === "string" ? msg : msg?.message;
      toast.error(text ?? (e instanceof Error ? e.message : "Action failed"));
    },
  });

  const uploadPod = async (file: File) => {
    if (!id || !data) return;
    setPodError(null);
    setPodUploading(true);
    try {
      if (file.size > 25 * 1024 * 1024) {
        throw new Error("File must be 25 MB or smaller");
      }
      const summary = await tradeDocumentsApi.upload(
        "SHIPMENT",
        data.shipmentWorkspaceId,
        "PROOF_OF_DELIVERY",
        file,
        user?.role === "TRUCKER" ? "OPERATOR" : "SUPPLIER",
      );
      const podDoc =
        summary.documents?.find(
          (d) => d.documentType === "PROOF_OF_DELIVERY" && d.status !== "MISSING" && d.id,
        ) ?? null;
      if (!podDoc?.id) throw new Error("POD document id missing after upload");
      await inlandApi.linkPod(id, podDoc.id);
      toast.success("POD uploaded and linked");
      invalidate();
      await refetch();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string | { message?: string; code?: string } } } })
          ?.response?.data?.error;
      const text =
        typeof msg === "string"
          ? msg
          : msg?.message || msg?.code || (e instanceof Error ? e.message : "POD upload failed");
      setPodError(text);
      toast.error(text);
    } finally {
      setPodUploading(false);
      if (podInputRef.current) podInputRef.current.value = "";
    }
  };

  const isTrucker = user?.role === "TRUCKER";
  const actions = new Set(data?.allowedActions ?? []);
  const showUploadPod =
    !!data
    && data.status === "DELIVERED"
    && data.podStatus === "PENDING"
    && actions.has("UPLOAD_POD");

  if (isLoading) return <p className="p-6 text-sm text-zinc-500">Loading delivery…</p>;
  if (isError || !data) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Failed to load inland delivery.</p>
        <button type="button" className="underline text-sm" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6" data-testid="inland-delivery-page">
      <header className="space-y-1">
        <Link
          to={isTrucker ? "/partner/inland" : "/buyer/inland"}
          className="text-xs text-blue-600 hover:underline"
        >
          ← Back
        </Link>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Inland Delivery</p>
        <h1 className="text-2xl font-semibold">{data.shipmentRef ?? "Delivery"}</h1>
        <p className="text-sm text-zinc-600">
          Status: <strong>{data.status.replace(/_/g, " ")}</strong>
          {" · "}
          Customs: {data.customsCleared ? "CLEARED" : "Not cleared"}
          {" · "}
          POD: {data.podStatus.replace(/_/g, " ")}
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        <Card title="Delivery summary">
          <Row label="Shipment" value={data.shipmentRef} />
          <Row label="Container" value={data.containerNumber} />
          <Row label="Pickup" value={data.pickupLocation} />
          <Row
            label="Destination"
            value={[data.deliveryName, data.deliveryAddress, data.deliveryCity]
              .filter(Boolean)
              .join(", ")}
          />
          <Row label="Contact" value={data.deliveryContactName} />
          <Row label="Phone" value={data.deliveryContactPhone} />
          {!isTrucker && (
            <Link
              className="mt-2 inline-block text-sm text-blue-600 underline"
              to={`/workspace/shipment/${data.shipmentWorkspaceId}`}
            >
              Open Shipment
            </Link>
          )}
        </Card>
        <Card title="Pickup">
          <Row
            label="Pickup at"
            value={data.pickupAt ? new Date(data.pickupAt).toLocaleString() : null}
          />
          <Row label="Window" value={data.pickupWindow} />
          <Row label="Appointment" value={data.appointmentRef} />
          <Row label="Instructions" value={data.instructions} />
          <Row label="Driver" value={data.driverName} />
          <Row label="Vehicle" value={data.vehiclePlate} />
          {!isTrucker && (
            <>
              <Row
                label="Inland cost"
                value={
                  data.inlandCostAmount != null
                    ? `${data.inlandCostAmount} ${data.inlandCostCurrency ?? ""}`.trim()
                    : null
                }
              />
              <Row label="Cost kind" value={data.inlandCostKind} />
            </>
          )}
        </Card>
      </section>

      <section
        className="rounded-xl border border-paper-200 bg-white p-4 space-y-3"
        data-testid="inland-actions"
      >
        <h2 className="text-lg font-medium">Actions</h2>
        {!isTrucker && actions.has("ASSIGN_TRUCKER") && (
          <button
            type="button"
            className="rounded-lg bg-accent-900 px-3 py-1.5 text-sm text-white"
            disabled={run.isPending}
            onClick={() => run.mutate("SYNC_TRUCKER")}
          >
            Sync trucker assignment
          </button>
        )}
        {(actions.has("SCHEDULE_PICKUP") || data.status === "TRUCKER_ASSIGNED") && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-zinc-600">
              Pickup date/time
              <input
                type="datetime-local"
                className="mt-1 block rounded border px-2 py-1 text-sm"
                value={pickupAt}
                onChange={(e) => setPickupAt(e.target.value)}
                data-testid="pickup-at-input"
              />
            </label>
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              disabled={run.isPending}
              onClick={() => run.mutate("SCHEDULE_PICKUP")}
              data-testid="schedule-pickup"
            >
              Schedule pickup
            </button>
          </div>
        )}
        {actions.has("READY_FOR_PICKUP") && (
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 text-sm"
            disabled={run.isPending}
            onClick={() => run.mutate("READY_FOR_PICKUP")}
          >
            Mark ready for pickup
          </button>
        )}
        {actions.has("CONFIRM_PICKUP") && (
          <button
            type="button"
            className="rounded-lg bg-accent-900 px-3 py-1.5 text-sm text-white"
            disabled={run.isPending}
            onClick={() => run.mutate("CONFIRM_PICKUP")}
            data-testid="confirm-pickup"
          >
            Confirm pickup
          </button>
        )}
        {actions.has("GATE_OUT") && (
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 text-sm"
            disabled={run.isPending}
            onClick={() => run.mutate("GATE_OUT")}
          >
            Record gate-out
          </button>
        )}
        {actions.has("IN_TRANSIT") && (
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 text-sm"
            disabled={run.isPending}
            onClick={() => run.mutate("IN_TRANSIT")}
          >
            Mark in transit
          </button>
        )}
        {actions.has("MARK_DELIVERED") && (
          <button
            type="button"
            className="rounded-lg bg-accent-900 px-3 py-1.5 text-sm text-white"
            disabled={run.isPending}
            onClick={() => run.mutate("MARK_DELIVERED")}
            data-testid="mark-delivered"
          >
            Mark delivered
          </button>
        )}

        {showUploadPod && (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2"
            data-testid="inland-pod-upload"
          >
            <p className="text-sm font-medium text-amber-950">
              Delivery is complete — Proof of Delivery is still pending.
            </p>
            <input
              ref={podInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="hidden"
              data-testid="inland-pod-file-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadPod(file);
              }}
            />
            <button
              type="button"
              className="rounded-lg bg-accent-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              disabled={podUploading}
              data-testid="upload-pod"
              onClick={() => podInputRef.current?.click()}
            >
              {podUploading ? "Uploading…" : "Upload POD"}
            </button>
            {podError && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-red-700">
                <span data-testid="pod-upload-error">{podError}</span>
                <button
                  type="button"
                  className="underline"
                  data-testid="pod-upload-retry"
                  onClick={() => podInputRef.current?.click()}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {data.podStatus === "AVAILABLE" && (
          <p className="text-sm text-emerald-800" data-testid="pod-available">
            POD linked — available on the shipment Trade Documents.
          </p>
        )}

        {actions.has("RECORD_COST") && !isTrucker && (
          <div
            className="rounded-lg border border-paper-200 p-3 space-y-2"
            data-testid="inland-cost-form"
          >
            <p className="text-sm font-medium">Record inland cost</p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-zinc-600">
                Amount
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 block rounded border px-2 py-1 text-sm w-32"
                  value={costAmount}
                  onChange={(e) => setCostAmount(e.target.value)}
                  data-testid="inland-cost-amount"
                />
              </label>
              <label className="text-xs text-zinc-600">
                Currency
                <input
                  className="mt-1 block rounded border px-2 py-1 text-sm w-20 uppercase"
                  value={costCurrency}
                  onChange={(e) => setCostCurrency(e.target.value.toUpperCase())}
                  data-testid="inland-cost-currency"
                />
              </label>
              <label className="text-xs text-zinc-600">
                Kind
                <select
                  className="mt-1 block rounded border px-2 py-1 text-sm"
                  value={costKind}
                  onChange={(e) => setCostKind(e.target.value as "ESTIMATED" | "ACTUAL")}
                  data-testid="inland-cost-kind"
                >
                  <option value="ACTUAL">ACTUAL</option>
                  <option value="ESTIMATED">ESTIMATED</option>
                </select>
              </label>
              <button
                type="button"
                className="rounded-lg bg-accent-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={run.isPending}
                data-testid="record-inland-cost"
                onClick={() => run.mutate("RECORD_COST")}
              >
                Save inland cost
              </button>
            </div>
          </div>
        )}

        <label className="block text-xs text-zinc-600">
          Note (optional)
          <input
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <p className="text-xs text-zinc-500">
          Operational status only — no live truck GPS. POD uploads use Trade Documents
          (PROOF_OF_DELIVERY) and link to this inland delivery.
        </p>
      </section>

      <section className="rounded-xl border border-paper-200 bg-white p-4">
        <h2 className="text-lg font-medium mb-2">Activity</h2>
        <ul className="text-xs space-y-1 max-h-48 overflow-auto">
          {(Array.isArray(events) ? events : []).map(
            (e: {
              id: string;
              reason?: string;
              fromStatus?: string;
              toStatus?: string;
              createdAt: string;
            }) => (
              <li key={e.id}>
                {e.reason ?? `${e.fromStatus} → ${e.toStatus}`} ·{" "}
                {new Date(e.createdAt).toLocaleString()}
              </li>
            ),
          )}
        </ul>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-paper-200 bg-white p-4 space-y-1">
      <h2 className="text-lg font-medium mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}
