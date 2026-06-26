import { AppError } from "../../utils/httpErrors.js";
import type { ActorRole } from "@dmx/contracts/rfq.fsm";

export interface PreconditionInput {
  workspace: Record<string, unknown>;
  payload: Record<string, unknown>;
  actor: { id: string; role: ActorRole };
}

export type PreconditionFn = (input: PreconditionInput) => void;

function shp(ws: PreconditionInput["workspace"]) {
  return ws.shipmentWorkspace as Record<string, unknown> | null | undefined;
}

export const PRECONDITIONS: Record<string, PreconditionFn> = {
  assertContainerNumber: ({ payload }) => {
    if (!String(payload.containerNumber ?? "").trim()) throw new AppError(400, "CONTAINER_NUMBER_REQUIRED");
  },
  assertVesselLoaded: ({ payload }) => {
    if (!String(payload.vesselName ?? "").trim()) throw new AppError(400, "VESSEL_NAME_REQUIRED");
  },
  assertExceptionCategory: ({ payload }) => {
    const cats = ["VESSEL_DELAY", "CUSTOMS_HOLD", "DOCUMENT_MISSING", "PORT_CONGESTION", "DELIVERY_DELAY", "OTHER"];
    if (!cats.includes(String(payload.category))) throw new AppError(400, "EXCEPTION_CATEGORY_REQUIRED");
  },
  assertResolution: ({ payload }) => {
    if (!String(payload.resolution ?? "").trim()) throw new AppError(400, "RESOLUTION_REQUIRED");
  },
  assertDocumentUpload: ({ payload }) => {
    if (!payload.documentType || !payload.storageKey || !payload.fileName) {
      throw new AppError(400, "DOCUMENT_FIELDS_REQUIRED");
    }
  },
  assertPartialDeliveryPayload: ({ payload }) => {
    if (!String(payload.partialDeliveryNote ?? "").trim()) {
      throw new AppError(400, "PARTIAL_DELIVERY_NOTE_REQUIRED");
    }
  },
  assertOpenException: ({ workspace }) => {
    const open = (workspace.shipmentExceptions as Array<{ status: string }> | undefined)?.some?.(
      (e) => e.status === "OPEN",
    );
    if (!open) throw new AppError(400, "NO_OPEN_EXCEPTION");
  },
};
