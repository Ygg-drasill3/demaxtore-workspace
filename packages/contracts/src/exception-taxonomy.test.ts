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

  it("DELIVERY_DELAY suggests order dispute in Faz 2", () => {
    expect(shouldSuggestOrderDispute("DELIVERY_DELAY")).toBe(true);
    expect(shouldSuggestOrderDispute("VESSEL_DELAY")).toBe(false);
  });
});
