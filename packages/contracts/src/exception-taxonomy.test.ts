import { describe, it, expect } from "vitest";
import {
  ORDER_DISPUTE_CATEGORIES,
  SHIPMENT_EXCEPTION_CATEGORIES,
  shouldSuggestOrderDispute,
} from "./exception-taxonomy";

describe("exception-taxonomy", () => {
  it("defines order dispute and shipment exception category sets", () => {
    expect(ORDER_DISPUTE_CATEGORIES).toContain("QUALITY");
    expect(SHIPMENT_EXCEPTION_CATEGORIES).toContain("VESSEL_DELAY");
  });

  it("only DELIVERY_DELAY mirrors to an order dispute suggestion", () => {
    const mirrored = SHIPMENT_EXCEPTION_CATEGORIES.filter((c) => shouldSuggestOrderDispute(c));
    expect(mirrored).toEqual(["DELIVERY_DELAY"]);
  });

  it("carrier and authority side exceptions never suggest a commercial dispute", () => {
    for (const cat of ["VESSEL_DELAY", "PORT_CONGESTION", "CUSTOMS_HOLD", "DOCUMENT_MISSING", "OTHER"] as const) {
      expect(shouldSuggestOrderDispute(cat)).toBe(false);
    }
  });

  it("a mirrored exception maps onto a real order dispute category", () => {
    // The suggestion is only actionable if the order side has a matching category.
    expect(ORDER_DISPUTE_CATEGORIES).toContain("DELAY");
  });
});
