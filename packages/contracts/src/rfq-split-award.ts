// =============================================================================
// RFQ line-item split award — types + pure aggregate state helpers
// Destination: packages/contracts/src/rfq-split-award.ts
//
// One winning quotation per RFQ line item. Variations within a line item are
// awarded together as a single offer package (whole quotation row for that product).
// =============================================================================

/** Per RFQ line item — sourcing / award lifecycle. */
export type RfqLineAwardStatus =
  | "OPEN"
  | "AWARDED"
  | "NO_AWARD"
  | "CANCELLED";

/** Buyer-facing aggregate award phase (maps to workspace.state after RFQ_OPEN). */
export type RfqAwardAggregateState =
  | "OPEN"
  | "PARTIALLY_AWARDED"
  | "FULLY_AWARDED";

export interface RfqLineAwardSnapshot {
  rfqLineItemId: string;
  status: RfqLineAwardStatus;
}

/** Active line award row (persisted as RfqLineAward with status ACTIVE). */
export interface RfqLineAwardRecord {
  rfqLineItemId: string;
  quotationId: string;
  supplierUserId: string;
  awardedAt: string;
  rationale?: string | null;
}

export interface RfqLineAwardContext {
  lines: RfqLineAwardSnapshot[];
  /** Supplier user ids with at least one AWARDED line not yet on a PO. */
  suppliersPendingPo?: string[];
}

const TERMINAL_LINE: ReadonlySet<RfqLineAwardStatus> = new Set([
  "AWARDED",
  "NO_AWARD",
  "CANCELLED",
]);

export function isLineAwardTerminal(status: RfqLineAwardStatus): boolean {
  return TERMINAL_LINE.has(status);
}

/** Derive aggregate award state from line item statuses. */
export function computeRfqAwardAggregateState(
  lines: RfqLineAwardSnapshot[],
): RfqAwardAggregateState {
  if (!lines.length) return "OPEN";
  const allTerminal = lines.every((l) => isLineAwardTerminal(l.status));
  if (allTerminal) return "FULLY_AWARDED";
  const anyAwarded = lines.some((l) => l.status === "AWARDED");
  if (anyAwarded) return "PARTIALLY_AWARDED";
  return "OPEN";
}

export function countLinesByStatus(
  lines: RfqLineAwardSnapshot[],
): Record<RfqLineAwardStatus, number> {
  const counts: Record<RfqLineAwardStatus, number> = {
    OPEN: 0,
    AWARDED: 0,
    NO_AWARD: 0,
    CANCELLED: 0,
  };
  for (const l of lines) counts[l.status] += 1;
  return counts;
}

/** Lines that may still receive supplier quotations. */
export function openLineItemIds(lines: RfqLineAwardSnapshot[]): string[] {
  return lines.filter((l) => l.status === "OPEN").map((l) => l.rfqLineItemId);
}

/** Map workspace FSM state ↔ aggregate award label for UI badges. */
export function rfqAwardAggregateFromWorkspaceState(
  workspaceState: string,
  lines: RfqLineAwardSnapshot[],
): RfqAwardAggregateState {
  if (workspaceState === "PARTIALLY_AWARDED") return "PARTIALLY_AWARDED";
  if (workspaceState === "FULLY_AWARDED") return "FULLY_AWARDED";
  if (["CLOSED", "CLOSED_NO_AWARD", "PO_ISSUED"].includes(workspaceState)) {
    return computeRfqAwardAggregateState(lines);
  }
  if (["RFQ_OPEN", "QUOTATIONS_CLOSED", "UNDER_EVALUATION"].includes(workspaceState)) {
    return computeRfqAwardAggregateState(lines);
  }
  return "OPEN";
}
