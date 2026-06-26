import { AppError } from "../../utils/httpErrors.js";
import type { ActorRole } from "@dmx/contracts/order.fsm";
import { isFreightOfferSelected } from "@dmx/contracts/order.freight-coordination";

export interface PreconditionInput {
  workspace: Record<string, unknown>;
  payload: Record<string, unknown>;
  actor: { id: string; role: ActorRole };
}

export type PreconditionFn = (input: PreconditionInput) => void;

function orderWs(ws: PreconditionInput["workspace"]) {
  return ws.orderWorkspace as {
    inspectionResult?: string | null;
  } | null | undefined;
}

export const PRECONDITIONS: Record<string, PreconditionFn> = {
  assertPlannedCompletionDate: ({ payload }) => {
    if (!payload.plannedCompletionDate) throw new AppError(400, "PLANNED_COMPLETION_REQUIRED");
  },
  assertProgressLabel: ({ payload }) => {
    if (!String(payload.label ?? "").trim()) throw new AppError(400, "PROGRESS_LABEL_REQUIRED");
  },
  assertProgressPercentage: ({ payload }) => {
    const pct = Number(payload.percentage);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new AppError(400, "PROGRESS_PERCENTAGE_REQUIRED");
    }
  },
  assertProgressBelow100: ({ payload }) => {
    const pct = Number(payload.percentage);
    if (pct >= 100) {
      throw new AppError(409, "PRODUCTION_USE_COMPLETE_ACTION", {
        message: "Üretim %100 için 'Update Production' alanına 100 girin — sipariş otomatik tamamlanır",
      });
    }
  },
  assertLatestProductionPercent100: ({ workspace, payload }) => {
    const pct = Number(payload.percentage);
    if (Number.isFinite(pct) && pct >= 100) return;

    const updates =
      (workspace.orderStatusUpdates as Array<{ percentage?: number | null; updateType?: string }>) ?? [];
    const latest = updates.find((u) => u.updateType === "PRODUCTION") ?? updates[0];
    if (latest?.percentage != null && latest.percentage >= 100) return;

    throw new AppError(409, "PRODUCTION_NOT_100_PERCENT", {
      message: "Sipariş ancak üretim %100 raporlandıktan sonra ilerleyebilir",
    });
  },
  assertInspectionResult: ({ payload }) => {
    if (!["PASS", "FAIL"].includes(String(payload.result))) throw new AppError(400, "INVALID_INSPECTION_RESULT");
    if (!payload.reportUrl) throw new AppError(400, "REPORT_URL_REQUIRED");
    if (!payload.inspectorName) throw new AppError(400, "INSPECTOR_NAME_REQUIRED");
  },
  assertInspectionPass: ({ workspace }) => {
    if (orderWs(workspace)?.inspectionResult !== "PASS") throw new AppError(400, "INSPECTION_NOT_PASS");
  },
  assertShipmentBooked: ({ payload }) => {
    if (!payload.freightForwarder || !payload.vesselName || !payload.billOfLading || !payload.expectedDeparture) {
      throw new AppError(400, "SHIPMENT_FIELDS_REQUIRED");
    }
  },
  assertActualDepartureDate: ({ payload }) => {
    if (!payload.actualDepartureDate) throw new AppError(400, "ACTUAL_DEPARTURE_REQUIRED");
  },
  assertNewEta: ({ payload }) => {
    if (!payload.newEta) throw new AppError(400, "NEW_ETA_REQUIRED");
  },
  assertActualArrivalDate: ({ payload }) => {
    if (!payload.actualArrivalDate) throw new AppError(400, "ACTUAL_ARRIVAL_REQUIRED");
  },
  assertPartialDeliveryPayload: ({ payload }) => {
    if (!String(payload.partialDeliveryNote ?? "").trim()) {
      throw new AppError(400, "PARTIAL_DELIVERY_NOTE_REQUIRED");
    }
  },
  assertSettlementConfirmation: ({ payload }) => {
    if (!String(payload.settlementConfirmation ?? "").trim()) throw new AppError(400, "SETTLEMENT_CONFIRMATION_REQUIRED");
  },
  assertDisputeCategory: ({ payload }) => {
    const cats = ["QUALITY", "DELAY", "DAMAGE", "DOCUMENT", "PAYMENT", "OTHER"];
    if (!cats.includes(String(payload.category))) throw new AppError(400, "DISPUTE_CATEGORY_REQUIRED");
  },
  assertDisputeResolution: ({ payload }) => {
    if (!String(payload.resolution ?? "").trim()) throw new AppError(400, "RESOLUTION_REQUIRED");
  },
  assertDocumentUpload: ({ payload }) => {
    if (!payload.documentType || !payload.storageKey || !payload.fileName) {
      throw new AppError(400, "DOCUMENT_FIELDS_REQUIRED");
    }
  },
  assertFreightCoordinationReady: ({ workspace }) => {
    const freightRequests = (workspace.freightRequests as Array<{ status: string; selection?: unknown }>) ?? [];
    if (!isFreightOfferSelected(freightRequests)) {
      throw new AppError(409, "FREIGHT_OFFER_NOT_SELECTED", {
        message:
          "FreightIQ bölümünden bir navlun teklifi seçin (veya admin teklif girsin). Seçim yapılmadan sevkiyat rezerve edilemez.",
      });
    }
  },
};
