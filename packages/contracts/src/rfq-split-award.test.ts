import { describe, expect, it } from "vitest";
import {
  computeRfqAwardAggregateState,
  countLinesByStatus,
  openLineItemIds,
  type RfqLineAwardSnapshot,
} from "./rfq-split-award";
import { RFQ_SPLIT_AWARD_TRANSITIONS } from "./rfq-split-award.fsm";
import { findRfqTransition } from "./rfq.fsm";

const line = (id: string, status: RfqLineAwardSnapshot["status"]): RfqLineAwardSnapshot => ({
  rfqLineItemId: id,
  status,
});

describe("computeRfqAwardAggregateState", () => {
  it("returns OPEN when no lines or all OPEN", () => {
    expect(computeRfqAwardAggregateState([])).toBe("OPEN");
    expect(computeRfqAwardAggregateState([line("a", "OPEN"), line("b", "OPEN")])).toBe("OPEN");
  });

  it("returns PARTIALLY_AWARDED when at least one AWARDED and others not terminal", () => {
    expect(
      computeRfqAwardAggregateState([line("a", "AWARDED"), line("b", "OPEN")]),
    ).toBe("PARTIALLY_AWARDED");
  });

  it("returns FULLY_AWARDED when every line is terminal", () => {
    expect(
      computeRfqAwardAggregateState([line("a", "AWARDED"), line("b", "NO_AWARD")]),
    ).toBe("FULLY_AWARDED");
    expect(
      computeRfqAwardAggregateState([line("a", "CANCELLED"), line("b", "NO_AWARD")]),
    ).toBe("FULLY_AWARDED");
  });
});

describe("openLineItemIds", () => {
  it("lists only OPEN lines", () => {
    expect(
      openLineItemIds([line("a", "AWARDED"), line("b", "OPEN"), line("c", "NO_AWARD")]),
    ).toEqual(["b"]);
  });
});

describe("countLinesByStatus", () => {
  it("counts by status", () => {
    expect(
      countLinesByStatus([line("a", "AWARDED"), line("b", "OPEN"), line("c", "OPEN")]),
    ).toEqual({ OPEN: 2, AWARDED: 1, NO_AWARD: 0, CANCELLED: 0 });
  });
});

describe("RFQ_SPLIT_AWARD_TRANSITIONS", () => {
  it("registers award_line_item from RFQ_OPEN", () => {
    const t = findRfqTransition("RFQ_OPEN", "award_line_item");
    expect(t).toBeDefined();
    expect(["PARTIALLY_AWARDED", "FULLY_AWARDED"]).toContain(t!.to);
  });

  it("registers issue_supplier_po without requiring whole-RFQ PO_ISSUED first", () => {
    const partial = findRfqTransition("PARTIALLY_AWARDED", "issue_supplier_po");
    expect(partial?.action).toBe("issue_supplier_po");
    expect(RFQ_SPLIT_AWARD_TRANSITIONS.some((t) => t.action === "issue_supplier_po")).toBe(true);
  });
});
