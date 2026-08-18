// =============================================================================
// RFQ line-item split award — transition resolution + workspace helpers
// =============================================================================

import {
  RFQ_ALL_TRANSITIONS,
  type RfqState,
  type RfqAction,
  type RfqTransition,
} from "@dmx/contracts/rfq.fsm";
import {
  isLineAwardTerminal,
  type RfqLineAwardSnapshot,
  type RfqLineAwardStatus,
} from "@dmx/contracts/rfq-split-award";
import { AppError } from "../../utils/httpErrors.js";

type LineRow = { id: string; awardStatus: string };
type AwardRow = {
  rfqLineItemId: string;
  status: string;
  supplierPoSpawnId: string | null;
  supplierUserId: string;
};

const SPLIT_AWARD_ACTIONS = new Set<RfqAction>([
  "award_line_item",
  "revert_line_award",
  "mark_line_no_award",
  "issue_supplier_po",
  "close_rfq_awards",
]);

export function isSplitAwardAction(action: RfqAction): boolean {
  return SPLIT_AWARD_ACTIONS.has(action);
}

export function lineSnapshots(lines: LineRow[]): RfqLineAwardSnapshot[] {
  return lines.map((l) => ({
    rfqLineItemId: l.id,
    status: l.awardStatus as RfqLineAwardStatus,
  }));
}

function pickTransition(from: RfqState, action: RfqAction, to: RfqState): RfqTransition | undefined {
  return RFQ_ALL_TRANSITIONS.find((t) => t.from === from && t.action === action && t.to === to);
}

function projectLineStatus(
  lines: RfqLineAwardSnapshot[],
  rfqLineItemId: string,
  status: RfqLineAwardStatus,
): RfqLineAwardSnapshot[] {
  return lines.map((l) =>
    l.rfqLineItemId === rfqLineItemId ? { ...l, status } : l,
  );
}

function allTerminal(lines: RfqLineAwardSnapshot[]): boolean {
  return lines.length > 0 && lines.every((l) => isLineAwardTerminal(l.status));
}

function anyAwarded(lines: RfqLineAwardSnapshot[]): boolean {
  return lines.some((l) => l.status === "AWARDED");
}

/** Resolve target workspace state for split-award actions (multiple FSM rows per action). */
export function resolveSplitAwardTransition(
  from: RfqState,
  action: RfqAction,
  workspace: {
    rfqLineItems?: LineRow[];
    rfqLineAwards?: AwardRow[];
  },
  payload: Record<string, unknown>,
): RfqTransition | undefined {
  const snapshots = lineSnapshots(workspace.rfqLineItems ?? []);
  const awards = workspace.rfqLineAwards ?? [];
  const rfqLineItemId = payload.rfqLineItemId as string | undefined;

  if (action === "award_line_item") {
    if (!rfqLineItemId) throw new AppError(400, "RFQ_LINE_ITEM_REQUIRED");
    const projected = projectLineStatus(snapshots, rfqLineItemId, "AWARDED");
    const to: RfqState = allTerminal(projected) ? "FULLY_AWARDED" : "PARTIALLY_AWARDED";
    return pickTransition(from, action, to);
  }

  if (action === "revert_line_award") {
    if (!rfqLineItemId) throw new AppError(400, "RFQ_LINE_ITEM_REQUIRED");
    const projected = projectLineStatus(snapshots, rfqLineItemId, "OPEN");
    const to: RfqState = !anyAwarded(projected)
      ? "RFQ_OPEN"
      : allTerminal(projected)
        ? "FULLY_AWARDED"
        : "PARTIALLY_AWARDED";
    return pickTransition(from, action, to);
  }

  if (action === "mark_line_no_award") {
    if (!rfqLineItemId) throw new AppError(400, "RFQ_LINE_ITEM_REQUIRED");
    const projected = projectLineStatus(snapshots, rfqLineItemId, "NO_AWARD");
    const to: RfqState = allTerminal(projected) ? "FULLY_AWARDED" : "PARTIALLY_AWARDED";
    return pickTransition(from, action, to);
  }

  if (action === "issue_supplier_po") {
    const supplierUserId = payload.supplierUserId as string;
    if (!supplierUserId) throw new AppError(400, "RFQ_SUPPLIER_ID_REQUIRED");

    const activeAwards = awards.filter((a) => a.status === "ACTIVE" && a.supplierUserId === supplierUserId);
    if (!activeAwards.some((a) => !a.supplierPoSpawnId)) {
      throw new AppError(409, "SUPPLIER_PO_ALREADY_ISSUED");
    }

    const simulatedAwards = awards.map((a) =>
      a.status === "ACTIVE" && a.supplierUserId === supplierUserId && !a.supplierPoSpawnId
        ? { ...a, supplierPoSpawnId: "pending" }
        : a,
    );
    const lines = workspace.rfqLineItems ?? [];
    const stillMissing = lines
      .filter((l) => l.awardStatus === "AWARDED")
      .some((l) => {
        const a = simulatedAwards.find((x) => x.rfqLineItemId === l.id && x.status === "ACTIVE");
        return !a?.supplierPoSpawnId;
      });

    if (from === "FULLY_AWARDED" && !stillMissing) {
      return pickTransition(from, action, "PO_ISSUED");
    }
    return pickTransition(from, action, from === "FULLY_AWARDED" ? "FULLY_AWARDED" : "PARTIALLY_AWARDED");
  }

  if (action === "close_rfq_awards") {
    return pickTransition(from, action, "CLOSED");
  }

  return undefined;
}

export function allAwardedLinesHavePo(
  lines: LineRow[],
  awards: AwardRow[],
): boolean {
  const awardedIds = lines.filter((l) => l.awardStatus === "AWARDED").map((l) => l.id);
  for (const id of awardedIds) {
    const award = awards.find((a) => a.rfqLineItemId === id && a.status === "ACTIVE");
    if (!award?.supplierPoSpawnId) return false;
  }
  return awardedIds.length > 0;
}
