import { useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { api } from "@/lib/api";

export interface ActionModalState {
  action: string;
  label: string;
  variant?: "primary" | "secondary" | "destructive";
  requiresReason?: boolean;
  requiresConfirmation?: boolean;
}

interface Props {
  open: boolean;
  state: ActionModalState | null;
  workspaceKind: "order" | "shipment";
  workspaceId: string;
  onClose: () => void;
  onConfirm: (body: { payload: Record<string, unknown>; reason?: string }) => void;
  isPending?: boolean;
}

function toDatetimeLocal(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(v: string): string {
  return new Date(v).toISOString();
}

const ORDER_FIELDS: Partial<Record<string, string[]>> = {
  supplier_confirm_order: ["plannedCompletionDate"],
  start_production: ["plannedCompletionDate"],
  report_production_progress: ["label", "percentage"],
  request_inspection: ["inspectorName"],
  record_inspection_result: ["result", "inspectorName", "reportFile"],
  book_shipment: ["freightForwarder", "vesselName", "billOfLading", "expectedDeparture"],
  mark_departed: ["actualDepartureDate"],
  update_eta: ["newEta", "reason"],
  mark_arrived: ["actualArrivalDate"],
  mark_partially_delivered: ["partialDeliveryNote", "deliveredQuantity", "remainingQuantity"],
  close_order: ["settlementConfirmation"],
  reject_order: ["reason"],
  open_dispute: ["category", "reason"],
  cancel_order: ["reason"],
  resolve_dispute_close: ["resolution"],
  resolve_dispute_cancel: ["resolution"],
  upload_document: ["documentType", "file"],
};

const SHIPMENT_FIELDS: Partial<Record<string, string[]>> = {
  confirm_booking: ["carrierName", "bookingRef"],
  assign_container: ["containerNumber"],
  load_vessel: ["vesselName", "voyageNumber"],
  confirm_partial_delivery: ["partialDeliveryNote", "deliveredQuantity", "remainingQuantity"],
  reject_shipment: ["reason"],
  report_exception: ["category", "reason"],
  resolve_exception: ["resolution", "resumeState"],
  cancel_shipment: ["reason"],
};

export function orderActionNeedsModal(action: string): boolean {
  return action in ORDER_FIELDS;
}

export function shipmentActionNeedsModal(action: string): boolean {
  return action in SHIPMENT_FIELDS;
}

export function WorkspaceActionModal({
  open,
  state,
  workspaceKind,
  workspaceId,
  onClose,
  onConfirm,
  isPending,
}: Props) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [uploading, setUploading] = useState(false);

  const action = state?.action ?? "";
  const fieldList =
    workspaceKind === "order" ? ORDER_FIELDS[action] ?? [] : SHIPMENT_FIELDS[action] ?? [];

  useEffect(() => {
    if (!open || !state) return;
    const init: Record<string, string> = {};
    if (fieldList.includes("plannedCompletionDate") || fieldList.includes("expectedDeparture") || fieldList.includes("newEta")) {
      const future = new Date(Date.now() + 30 * 86400_000);
      init.plannedCompletionDate = toDatetimeLocal(future.toISOString());
      init.expectedDeparture = toDatetimeLocal(future.toISOString());
      init.newEta = toDatetimeLocal(future.toISOString());
    }
    if (fieldList.includes("actualDepartureDate") || fieldList.includes("actualArrivalDate")) {
      init.actualDepartureDate = toDatetimeLocal();
      init.actualArrivalDate = toDatetimeLocal();
    }
    if (fieldList.includes("label")) init.label = "Production update";
    if (fieldList.includes("percentage")) init.percentage = "50";
    if (fieldList.includes("inspectorName")) init.inspectorName = "SGS";
    if (fieldList.includes("result")) init.result = "PASS";
    if (fieldList.includes("freightForwarder")) {
      init.freightForwarder = "Maersk Logistics";
      init.vesselName = "MV Workspace";
      init.billOfLading = `BL-${Date.now()}`;
    }
    if (fieldList.includes("containerNumber")) init.containerNumber = `MSKU${Date.now().toString().slice(-7)}`;
    if (fieldList.includes("vesselName") && workspaceKind === "shipment") init.vesselName = "MV Workspace";
    if (fieldList.includes("settlementConfirmation")) init.settlementConfirmation = "Settlement confirmed";
    if (fieldList.includes("carrierName")) init.carrierName = "Maersk";
    if (fieldList.includes("bookingRef")) init.bookingRef = `BK-${Date.now()}`;
    if (fieldList.includes("category") && workspaceKind === "order") init.category = "OTHER";
    if (fieldList.includes("category") && workspaceKind === "shipment") init.category = "VESSEL_DELAY";
    if (fieldList.includes("documentType")) init.documentType = "OTHER";
    if (fieldList.includes("resumeState")) init.resumeState = "IN_TRANSIT";
    setFields(init);
    setReason("");
  }, [open, state, fieldList, workspaceKind]);

  async function uploadInspectionReport(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("documentType", "INSPECTION");
    const { data } = await api.post<{ id: string }>(`/orders/${workspaceId}/documents`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return `${window.location.origin}/api/orders/${workspaceId}/documents/${data.id}`;
  }

  const handleConfirm = async () => {
    if (!state) return;
    setUploading(true);
    try {
      const payload: Record<string, unknown> = {};

      for (const f of fieldList) {
        if (f === "file") continue;
        if (f === "reportFile") continue;
        const v = fields[f];
        if (!v && f !== "inspectorName" && f !== "bookingRef" && f !== "voyageNumber") continue;
        if (f.endsWith("Date") || f === "expectedDeparture" || f === "newEta" || f === "plannedCompletionDate") {
          if (v) payload[f] = fromDatetimeLocal(v);
        } else if (f === "percentage") {
          payload.percentage = Number(v);
        } else {
          payload[f] = v;
        }
      }

      if (fieldList.includes("reportFile")) {
        const input = document.getElementById("workspace-report-file") as HTMLInputElement | null;
        const file =
          input?.files?.[0] ??
          new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "inspection-report.pdf", {
            type: "application/pdf",
          });
        payload.reportUrl = await uploadInspectionReport(file);
        if (!payload.inspectorName) payload.inspectorName = "SGS Inspector";
      }

      if (fieldList.includes("file")) {
        const input = document.getElementById("workspace-action-file") as HTMLInputElement | null;
        const file = input?.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("documentType", fields.documentType ?? "OTHER");
        await api.post(`/orders/${workspaceId}/documents`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        onClose();
        return;
      }

      let bodyReason: string | undefined;
      if (state.requiresReason || ["open_dispute", "cancel_order", "cancel_shipment", "report_exception"].includes(action)) {
        bodyReason = reason.trim() || (payload.reason as string | undefined);
      }
      if (["resolve_dispute_close", "resolve_dispute_cancel", "resolve_exception"].includes(action)) {
        bodyReason = (payload.resolution as string) ?? reason.trim();
      }

      onConfirm({ payload, reason: bodyReason });
    } finally {
      setUploading(false);
    }
  };

  const set = (key: string, value: string) => setFields((prev) => ({ ...prev, [key]: value }));

  if (!state) return null;

  const needsReason =
    state.requiresReason ||
    ["open_dispute", "cancel_order", "cancel_shipment", "report_exception", "reject_order", "reject_shipment"].includes(action);

  const canConfirm =
    !needsReason ||
    reason.trim().length >= 3 ||
    (action === "open_dispute" && (fields.reason?.trim().length ?? 0) >= 3) ||
    (action === "cancel_order" && (fields.reason?.trim().length ?? 0) >= 3) ||
    (action === "cancel_shipment" && (fields.reason?.trim().length ?? 0) >= 3) ||
    (action === "report_exception" && (fields.reason?.trim().length ?? 0) >= 3) ||
    (["resolve_dispute_close", "resolve_dispute_cancel", "resolve_exception"].includes(action) &&
      (fields.resolution?.trim().length ?? 0) >= 3);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={state.label}
      description="Complete the required details before submitting."
      size="md"
      testId="workspace-action-modal"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            data-testid="workspace-action-confirm"
            variant={state.variant === "destructive" ? "destructive" : "primary"}
            onClick={() => void handleConfirm()}
            disabled={!canConfirm || isPending || uploading}
            loading={isPending || uploading}
          >
            Confirm
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {fieldList.includes("plannedCompletionDate") && (
          <label className="block text-sm">
            <span className="text-zinc-600">Planned completion</span>
            <Input
              type="datetime-local"
              data-testid="field-plannedCompletionDate"
              value={fields.plannedCompletionDate ?? ""}
              onChange={(e) => set("plannedCompletionDate", e.target.value)}
              className="mt-1"
            />
          </label>
        )}
        {fieldList.includes("label") && (
          <label className="block text-sm">
            <span className="text-zinc-600">Update label</span>
            <Input
              data-testid="field-label"
              value={fields.label ?? ""}
              onChange={(e) => set("label", e.target.value)}
              placeholder="Milestone description"
              className="mt-1"
            />
          </label>
        )}
        {fieldList.includes("percentage") && (
          <label className="block text-sm">
            <span className="text-zinc-600">Progress %</span>
            <Input
              type="number"
              min={0}
              max={100}
              data-testid="field-percentage"
              value={fields.percentage ?? ""}
              onChange={(e) => set("percentage", e.target.value)}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-zinc-500">
              %100&apos;den düşük değerlerde sipariş üretimde kalır. Üretim tamamlandığında 100 girin.
            </p>
          </label>
        )}
        {fieldList.includes("inspectorName") && (
          <label className="block text-sm">
            <span className="text-zinc-600">Inspector</span>
            <Input
              data-testid="field-inspectorName"
              value={fields.inspectorName ?? ""}
              onChange={(e) => set("inspectorName", e.target.value)}
              placeholder="SGS / Bureau Veritas"
              className="mt-1"
            />
          </label>
        )}
        {fieldList.includes("result") && (
          <label className="block text-sm">
            <span className="text-zinc-600">Result</span>
            <select
              data-testid="field-result"
              value={fields.result ?? "PASS"}
              onChange={(e) => set("result", e.target.value)}
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="PASS">Pass</option>
              <option value="FAIL">Fail</option>
            </select>
          </label>
        )}
        {fieldList.includes("reportFile") && (
          <div className="space-y-2">
            <label className="block text-sm text-zinc-600">Inspection report (PDF)</label>
            <label className="flex items-center gap-2 text-sm text-accent-900 cursor-pointer">
              <UploadCloud className="h-4 w-4" />
              <span>Choose file</span>
              <input
                id="workspace-report-file"
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFields((prev) => ({ ...prev, reportFileName: f.name }));
                }}
              />
            </label>
            {fields.reportFileName && <p className="text-xs text-zinc-500">{fields.reportFileName}</p>}
          </div>
        )}
        {fieldList.includes("freightForwarder") && (
          <>
            <label className="block text-sm">
              <span className="text-zinc-600">Freight forwarder</span>
              <Input data-testid="field-freightForwarder" value={fields.freightForwarder ?? ""} onChange={(e) => set("freightForwarder", e.target.value)} className="mt-1" />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Vessel</span>
              <Input data-testid="field-vesselName" value={fields.vesselName ?? ""} onChange={(e) => set("vesselName", e.target.value)} className="mt-1" />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Bill of lading</span>
              <Input data-testid="field-billOfLading" value={fields.billOfLading ?? ""} onChange={(e) => set("billOfLading", e.target.value)} className="mt-1" />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Expected departure</span>
              <Input type="datetime-local" data-testid="field-expectedDeparture" value={fields.expectedDeparture ?? ""} onChange={(e) => set("expectedDeparture", e.target.value)} className="mt-1" />
            </label>
          </>
        )}
        {fieldList.includes("actualDepartureDate") && (
          <label className="block text-sm">
            <span className="text-zinc-600">Actual departure</span>
            <Input type="datetime-local" data-testid="field-actualDepartureDate" value={fields.actualDepartureDate ?? ""} onChange={(e) => set("actualDepartureDate", e.target.value)} className="mt-1" />
          </label>
        )}
        {fieldList.includes("newEta") && (
          <>
            <label className="block text-sm">
              <span className="text-zinc-600">New ETA</span>
              <Input type="datetime-local" data-testid="field-newEta" value={fields.newEta ?? ""} onChange={(e) => set("newEta", e.target.value)} className="mt-1" />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Reason (optional)</span>
              <Input data-testid="field-reason" value={fields.reason ?? ""} onChange={(e) => set("reason", e.target.value)} className="mt-1" />
            </label>
          </>
        )}
        {fieldList.includes("actualArrivalDate") && (
          <label className="block text-sm">
            <span className="text-zinc-600">Actual arrival</span>
            <Input type="datetime-local" data-testid="field-actualArrivalDate" value={fields.actualArrivalDate ?? ""} onChange={(e) => set("actualArrivalDate", e.target.value)} className="mt-1" />
          </label>
        )}
        {fieldList.includes("settlementConfirmation") && (
          <label className="block text-sm">
            <span className="text-zinc-600">Settlement confirmation</span>
            <Input data-testid="field-settlementConfirmation" value={fields.settlementConfirmation ?? ""} onChange={(e) => set("settlementConfirmation", e.target.value)} className="mt-1" />
          </label>
        )}
        {fieldList.includes("category") && workspaceKind === "order" && (
          <label className="block text-sm">
            <span className="text-zinc-600">Category</span>
            <select data-testid="field-category" value={fields.category ?? "OTHER"} onChange={(e) => set("category", e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
              {["QUALITY", "DELAY", "DAMAGE", "DOCUMENT", "PAYMENT", "OTHER"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
        {fieldList.includes("category") && workspaceKind === "shipment" && (
          <label className="block text-sm">
            <span className="text-zinc-600">Exception category</span>
            <select data-testid="field-category" value={fields.category ?? "VESSEL_DELAY"} onChange={(e) => set("category", e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
              {["VESSEL_DELAY", "CUSTOMS_HOLD", "DOCUMENT_MISSING", "PORT_CONGESTION", "DELIVERY_DELAY", "OTHER"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
        {fieldList.includes("carrierName") && (
          <>
            <label className="block text-sm">
              <span className="text-zinc-600">Carrier</span>
              <Input data-testid="field-carrierName" value={fields.carrierName ?? ""} onChange={(e) => set("carrierName", e.target.value)} className="mt-1" />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Booking reference</span>
              <Input data-testid="field-bookingRef" value={fields.bookingRef ?? ""} onChange={(e) => set("bookingRef", e.target.value)} className="mt-1" />
            </label>
          </>
        )}
        {fieldList.includes("containerNumber") && (
          <label className="block text-sm">
            <span className="text-zinc-600">Container number</span>
            <Input data-testid="field-containerNumber" value={fields.containerNumber ?? ""} onChange={(e) => set("containerNumber", e.target.value)} placeholder="MSKU1234567" className="mt-1" />
          </label>
        )}
        {fieldList.includes("vesselName") && workspaceKind === "shipment" && (
          <>
            <label className="block text-sm">
              <span className="text-zinc-600">Vessel name</span>
              <Input data-testid="field-vesselName" value={fields.vesselName ?? ""} onChange={(e) => set("vesselName", e.target.value)} className="mt-1" />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Voyage number (optional)</span>
              <Input data-testid="field-voyageNumber" value={fields.voyageNumber ?? ""} onChange={(e) => set("voyageNumber", e.target.value)} className="mt-1" />
            </label>
          </>
        )}
        {fieldList.includes("resolution") && (
          <label className="block text-sm">
            <span className="text-zinc-600">Resolution</span>
            <Textarea data-testid="field-resolution" value={fields.resolution ?? ""} onChange={(e) => set("resolution", e.target.value)} rows={3} className="mt-1" />
          </label>
        )}
        {fieldList.includes("resumeState") && (
          <label className="block text-sm">
            <span className="text-zinc-600">Resume state</span>
            <select data-testid="field-resumeState" value={fields.resumeState ?? "IN_TRANSIT"} onChange={(e) => set("resumeState", e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
              {["BOOKING_CONFIRMED", "CONTAINER_ASSIGNED", "IN_TRANSIT", "ARRIVED_DESTINATION_PORT", "CUSTOMS_CLEARANCE", "READY_FOR_DELIVERY"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
        {fieldList.includes("documentType") && (
          <label className="block text-sm">
            <span className="text-zinc-600">Document type</span>
            <select data-testid="field-documentType" value={fields.documentType ?? "OTHER"} onChange={(e) => set("documentType", e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
              {["PO", "PI", "INSPECTION", "FREIGHT", "OTHER"].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
        )}
        {fieldList.includes("file") && (
          <label className="flex items-center gap-2 text-sm text-accent-900 cursor-pointer">
            <UploadCloud className="h-4 w-4" />
            <span>Choose file to upload</span>
            <input id="workspace-action-file" type="file" className="hidden" />
          </label>
        )}
        {(fieldList.includes("reason") || needsReason) && !fieldList.includes("resolution") && (
          <label className="block text-sm">
            <span className="text-zinc-600">Reason</span>
            <Textarea
              data-testid="field-reason-textarea"
              value={needsReason && !fieldList.includes("reason") ? reason : (fields.reason ?? "")}
              onChange={(e) => {
                if (needsReason && !fieldList.includes("reason")) setReason(e.target.value);
                else set("reason", e.target.value);
              }}
              rows={3}
              className="mt-1"
              placeholder="Min. 3 characters"
            />
          </label>
        )}
      </div>
    </Modal>
  );
}
