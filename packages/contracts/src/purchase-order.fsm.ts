// =============================================================================
// PRR-01 — Purchase Order finite state machine
// =============================================================================

/** Canonical lifecycle states (PRR-01). */
export const PURCHASE_ORDER_FSM_STATES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "IN_EXECUTION",
  "COMPLETED",
  "CLOSED",
  "CANCELLED",
] as const;
export type PurchaseOrderFsmState = (typeof PURCHASE_ORDER_FSM_STATES)[number];

/** Legacy statuses still present in older rows / clients. */
export const LEGACY_PURCHASE_ORDER_STATUSES = [
  "ISSUED",
  "ACKNOWLEDGED",
  "AMENDMENT_REQUESTED",
  "AMENDED",
] as const;
export type LegacyPurchaseOrderStatus = (typeof LEGACY_PURCHASE_ORDER_STATUSES)[number];

const LEGACY_TO_FSM: Record<LegacyPurchaseOrderStatus, PurchaseOrderFsmState> = {
  ISSUED: "SUBMITTED",
  ACKNOWLEDGED: "APPROVED",
  AMENDMENT_REQUESTED: "APPROVED",
  AMENDED: "IN_EXECUTION",
};

/**
 * Normalize any stored / inbound status into a canonical FSM state.
 * Unknown values default to SUBMITTED (safe operational default — never throws).
 */
export function canonicalizePurchaseOrderStatus(
  raw: string | null | undefined,
): PurchaseOrderFsmState {
  if (raw == null || String(raw).trim() === "") return "DRAFT";
  const v = String(raw).trim().toUpperCase();
  if ((PURCHASE_ORDER_FSM_STATES as readonly string[]).includes(v)) {
    return v as PurchaseOrderFsmState;
  }
  if (v in LEGACY_TO_FSM) return LEGACY_TO_FSM[v as LegacyPurchaseOrderStatus];
  return "SUBMITTED";
}

/** Allowed next states from each state. */
export const PO_FSM_TRANSITIONS: Record<PurchaseOrderFsmState, readonly PurchaseOrderFsmState[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "CANCELLED"],
  APPROVED: ["IN_EXECUTION", "CANCELLED"],
  IN_EXECUTION: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export function canTransitionPoStatus(
  from: string | null | undefined,
  to: string | null | undefined,
): boolean {
  const f = canonicalizePurchaseOrderStatus(from);
  const t = canonicalizePurchaseOrderStatus(to);
  if (f === t) return true;
  return PO_FSM_TRANSITIONS[f].includes(t);
}

export function assertCanTransitionPoStatus(
  from: string | null | undefined,
  to: string | null | undefined,
): void {
  if (!canTransitionPoStatus(from, to)) {
    const err = new Error(
      `Invalid PO transition: ${canonicalizePurchaseOrderStatus(from)} → ${canonicalizePurchaseOrderStatus(to)}`,
    );
    (err as Error & { code: string }).code = "INVALID_PO_TRANSITION";
    throw err;
  }
}

export const PO_CLOSE_ALLOWED_FROM: readonly PurchaseOrderFsmState[] = ["COMPLETED"];
export const PO_CANCEL_ALLOWED_FROM: readonly PurchaseOrderFsmState[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "IN_EXECUTION",
];
export const PO_AMENDMENT_ALLOWED_FROM: readonly PurchaseOrderFsmState[] = [
  "APPROVED",
  "IN_EXECUTION",
];
export const PO_ACKNOWLEDGE_ALLOWED_FROM: readonly PurchaseOrderFsmState[] = ["SUBMITTED"];
export const PO_SUBMIT_ALLOWED_FROM: readonly PurchaseOrderFsmState[] = ["DRAFT"];
export const PO_APPROVE_ALLOWED_FROM: readonly PurchaseOrderFsmState[] = ["SUBMITTED"];
export const PO_START_EXECUTION_ALLOWED_FROM: readonly PurchaseOrderFsmState[] = ["APPROVED"];
export const PO_COMPLETE_ALLOWED_FROM: readonly PurchaseOrderFsmState[] = ["IN_EXECUTION"];
export const PO_DRAFT_EDIT_ALLOWED_FROM: readonly PurchaseOrderFsmState[] = ["DRAFT"];

export function isTerminalPoStatus(status: string | null | undefined): boolean {
  const s = canonicalizePurchaseOrderStatus(status);
  return s === "CLOSED" || s === "CANCELLED";
}

export function isDraftPoStatus(status: string | null | undefined): boolean {
  return canonicalizePurchaseOrderStatus(status) === "DRAFT";
}

export function isActivePoStatus(status: string | null | undefined): boolean {
  return !isTerminalPoStatus(status);
}

/** Standardized timeline / audit event names (new writes only). */
export const PO_TIMELINE_EVENTS = [
  "po.created",
  "po.updated",
  "po.submitted",
  "po.approved",
  "po.revised",
  "po.cancelled",
  "po.completed",
  "po.closed",
  "po.acknowledged",
  "po.amendment.requested",
  "po.amendment.approved",
  "po.amendment.rejected",
  "po.document.uploaded",
  "po.document.replaced",
  "po.document.deleted",
] as const;
export type PoTimelineEvent = (typeof PO_TIMELINE_EVENTS)[number];

/** Map legacy timeline event types to canonical po.* names for readers. */
export function canonicalizePoTimelineEvent(raw: string | null | undefined): string {
  if (!raw) return "po.updated";
  const v = String(raw);
  const map: Record<string, string> = {
    PURCHASE_ORDER_CREATED: "po.created",
    PURCHASE_ORDER_ISSUED: "po.submitted",
    "po.issued": "po.submitted",
  };
  return map[v] ?? v;
}
