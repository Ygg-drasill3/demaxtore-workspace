// =============================================================================
// DeMaxtore — RFQ precondition map
// Destination: apps/backend/src/modules/rfq/rfq.preconditions.ts
//
// Each precondition is a pure function that throws AppError on failure.
// Looked up by string name from rfq.fsm.ts transition definitions.
// =============================================================================
import { AppError } from "../../utils/httpErrors";
import type { ActorRole } from "@dmx/contracts/rfq.fsm";

export interface PreconditionInput {
  workspace: any;                 // WorkspaceFull (with rfqDetails, rfqLineItems, supplierAssignments)
  payload:   Record<string, unknown>;
  actor:     { id: string; role: ActorRole };
}

export type PreconditionFn = (input: PreconditionInput) => void;

type QuotationRow = { id: string; supplierUserId: string; withdrawnAt: Date | null };

function activeQuotations(workspace: { quotations?: QuotationRow[] }): QuotationRow[] {
  return (workspace.quotations ?? []).filter((q) => !q.withdrawnAt);
}

function supplierHasQuotation(workspace: { quotations?: QuotationRow[] }, supplierUserId: string): boolean {
  return activeQuotations(workspace).some((q) => q.supplierUserId === supplierUserId);
}

const MAX_DEADLINE_EXTENSIONS = 2;       // FSM Decision #5
const MAX_DEADLINE_EXTENSION_DAYS = 14;  // FSM Decision #5

export const PRECONDITIONS: Record<string, PreconditionFn> = {

  assertSubmitPreconditions: ({ workspace }) => {
    const d = workspace.rfqDetails;
    if (!d) throw new AppError(409, "RFQ_DETAILS_MISSING");
    if (!workspace.rfqLineItems?.length) throw new AppError(400, "RFQ_EMPTY_LINE_ITEMS");
    if (!workspace.deadlineAt) throw new AppError(400, "RFQ_DEADLINE_MISSING");
    if (new Date(workspace.deadlineAt) <= new Date()) throw new AppError(400, "RFQ_DEADLINE_PAST");
    if (!workspace.currency) throw new AppError(400, "RFQ_NO_CURRENCY");
    for (const f of ["title", "productCategory", "productDescription", "targetMarket", "incoterm"] as const) {
      if (!d[f]) throw new AppError(400, "RFQ_MISSING_FIELD", { field: f });
    }
  },

  assertAssignable: ({ payload }) => {
    const ids = (payload.supplierUserIds as string[]) ?? [];
    if (!Array.isArray(ids) || ids.length === 0)
      throw new AppError(400, "RFQ_ASSIGN_NO_SUPPLIERS");
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalid = ids.filter((id) => typeof id !== "string" || !uuidRe.test(id));
    if (invalid.length) throw new AppError(400, "RFQ_INVALID_SUPPLIER_ID", { invalid });
    if (new Set(ids).size !== ids.length)
      throw new AppError(400, "RFQ_DUPLICATE_SUPPLIER_IDS");
  },

  assertSuppliersNew: ({ workspace, payload }) => {
    const existing = new Set(
      (workspace.supplierAssignments ?? []).map((a: any) => a.supplierUserId),
    );
    const incoming = (payload.supplierUserIds as string[]) ?? [];
    const dupes = incoming.filter((id) => existing.has(id));
    if (dupes.length) throw new AppError(409, "RFQ_SUPPLIERS_ALREADY_ASSIGNED", { dupes });
  },

  assertSupplierHasNoQuotation: ({ workspace, payload }) => {
    const sid = payload.supplierUserId as string;
    if (!sid) throw new AppError(400, "RFQ_SUPPLIER_ID_REQUIRED");
    if (supplierHasQuotation(workspace, sid))
      throw new AppError(409, "RFQ_SUPPLIER_HAS_QUOTATION", { supplierUserId: sid });
  },

  assertAtLeastOneSupplier: ({ workspace }) => {
    const n = (workspace.supplierAssignments ?? []).filter((a: any) => !a.removedAt).length;
    if (n < 1) throw new AppError(400, "RFQ_NO_SUPPLIERS_ASSIGNED");
  },

  assertFutureDeadline: ({ workspace }) => {
    if (!workspace.deadlineAt || new Date(workspace.deadlineAt) <= new Date())
      throw new AppError(400, "RFQ_DEADLINE_PAST");
  },

  assertNotYetTriaged: ({ workspace }) => {
    // Withdraw allowed only if admin hasn't moved the workspace forward
    if (workspace.state !== "RFQ_SUBMITTED")
      throw new AppError(409, "RFQ_ALREADY_TRIAGED");
  },

  assertAtLeastOneFieldChanged: ({ workspace, payload }) => {
    const before = workspace.rfqDetails ?? {};
    const after  = payload ?? {};
    const watch  = ["title", "productCategory", "productDescription", "targetMarket", "incoterm"] as const;
    const changed = watch.some((k) => k in after && (after as any)[k] !== (before as any)[k]);
    if (!changed && !("lineItems" in after) && !("deadlineAt" in after))
      throw new AppError(400, "RFQ_NO_FIELDS_CHANGED");
  },

  assertNoExistingQuotationFromSupplier: ({ workspace, actor }) => {
    if (supplierHasQuotation(workspace, actor.id))
      throw new AppError(409, "RFQ_QUOTATION_ALREADY_EXISTS");
  },
  assertExistingQuotationFromSupplier: ({ workspace, actor }) => {
    if (!supplierHasQuotation(workspace, actor.id))
      throw new AppError(409, "RFQ_QUOTATION_REQUIRED");
  },
  assertDeadlineNotPassed: ({ workspace }) => {
    if (workspace.deadlineAt && new Date(workspace.deadlineAt) < new Date())
      throw new AppError(409, "RFQ_DEADLINE_PASSED");
  },

  assertDeadlineExtensionAllowed: ({ workspace, payload }) => {
    const newDeadline = new Date(payload.newDeadline as string);
    if (!workspace.deadlineAt) throw new AppError(409, "RFQ_NO_CURRENT_DEADLINE");
    const current = new Date(workspace.deadlineAt);
    if (newDeadline <= current) throw new AppError(400, "EXTEND_NOT_GREATER");

    const nextCount = (workspace.deadlineExtensionCount ?? 0) + 1;
    if (nextCount > MAX_DEADLINE_EXTENSIONS)
      throw new AppError(409, "EXTEND_LIMIT_REACHED", { max: MAX_DEADLINE_EXTENSIONS });

    const addedDays = Math.ceil((newDeadline.getTime() - current.getTime()) / 86_400_000);
    const nextTotal = (workspace.deadlineExtensionTotalDays ?? 0) + addedDays;
    if (nextTotal > MAX_DEADLINE_EXTENSION_DAYS)
      throw new AppError(409, "EXTEND_DAYS_EXCEEDED", { max: MAX_DEADLINE_EXTENSION_DAYS, nextTotal });
  },

  assertHasQuotations: ({ workspace }) => {
    const count = (workspace as { _count?: { quotations?: number } })._count?.quotations ?? 0;
    if (count < 1) throw new AppError(409, "RFQ_NO_QUOTATIONS");
  },
  assertNoQuotations: ({ workspace }) => {
    const count = (workspace as { _count?: { quotations?: number } })._count?.quotations ?? 0;
    if (count > 0) throw new AppError(409, "RFQ_HAS_QUOTATIONS");
  },

  assertNewDeadline: ({ payload }) => {
    if (!payload.newDeadline) throw new AppError(400, "REOPEN_NEW_DEADLINE_REQUIRED");
    if (new Date(payload.newDeadline as string) <= new Date())
      throw new AppError(400, "REOPEN_DEADLINE_PAST");
  },

  assertQuotationValid: ({ workspace, payload }) => {
    const quotationId = payload.quotationId as string;
    const supplierUserId = payload.supplierUserId as string;
    if (!quotationId) throw new AppError(400, "RFQ_SELECT_NO_QUOTATION");
    if (!supplierUserId) throw new AppError(400, "RFQ_SELECT_NO_SUPPLIER");
    const q = activeQuotations(workspace).find((x) => x.id === quotationId);
    if (!q) throw new AppError(404, "RFQ_QUOTATION_NOT_FOUND");
    if (q.supplierUserId !== supplierUserId)
      throw new AppError(400, "RFQ_QUOTATION_SUPPLIER_MISMATCH", {
        quotationSupplier: q.supplierUserId,
        payloadSupplier: supplierUserId,
      });
    const assigned = (workspace.supplierAssignments ?? []).some(
      (a: { supplierUserId: string; removedAt?: Date | null }) =>
        a.supplierUserId === supplierUserId && !a.removedAt,
    );
    if (!assigned) throw new AppError(409, "RFQ_SUPPLIER_NOT_ASSIGNED", { supplierUserId });
  },

  assertProformaNotRequested: ({ workspace }) => {
    if (workspace.proformaRequestedAt)
      throw new AppError(409, "PROFORMA_ALREADY_REQUESTED");
  },

  assertProformaAttached: ({ payload }) => {
    if (!payload.proformaFileUrl) throw new AppError(400, "PROFORMA_FILE_MISSING");
  },

  assertPoNumberUnique: ({ workspace }) => {
    if (workspace.rfqDetails?.poNumber)
      throw new AppError(409, "PO_ALREADY_ISSUED", { poNumber: workspace.rfqDetails.poNumber });
    if (workspace.state === "PO_ISSUED" || workspace.state === "ORDER_ACTIVE")
      throw new AppError(409, "PO_ALREADY_ISSUED");
  },

  assertActiveFreightEstimate: ({ workspace }) => {
    const rows = (workspace as { freightEstimates?: unknown[] }).freightEstimates ?? [];
    if (rows.length === 0) {
      throw new AppError(409, "FREIGHT_ESTIMATE_REQUIRED", {
        message: "An active FreightIQ estimate is required before Purchase Order approval.",
      });
    }
  },
};
