import { describe, expect, it } from "vitest";
import {
  canTransitionCustomsStatus,
  isTurkeyCountryCode,
  summarizeReadiness,
} from "./customs.js";

describe("Sprint 37 customs contracts", () => {
  it("allows forward lifecycle and HOLD from active states", () => {
    expect(canTransitionCustomsStatus("DRAFT", "PREPARING")).toBe(true);
    expect(canTransitionCustomsStatus("PREPARING", "READY_FOR_BROKER")).toBe(true);
    expect(canTransitionCustomsStatus("CLEARANCE_PENDING", "CLEARED")).toBe(true);
    expect(canTransitionCustomsStatus("BROKER_REVIEW", "HOLD")).toBe(true);
    expect(canTransitionCustomsStatus("CLEARED", "HOLD")).toBe(false);
    expect(canTransitionCustomsStatus("HOLD", "PREPARING")).toBe(false);
    expect(canTransitionCustomsStatus("DRAFT", "CLEARED")).toBe(false);
  });

  it("detects Turkey destination codes", () => {
    expect(isTurkeyCountryCode("TR")).toBe(true);
    expect(isTurkeyCountryCode("Turkey")).toBe(true);
    expect(isTurkeyCountryCode("GH")).toBe(false);
    expect(isTurkeyCountryCode(null)).toBe(false);
  });

  it("summarizes readiness deterministically", () => {
    const partial = summarizeReadiness([
      { code: "A", status: "PASS" },
      { code: "B", status: "WARNING", reason: "CANDIDATE" },
      { code: "C", status: "FAIL", reason: "BROKER_MISSING" },
    ]);
    expect(partial.status).toBe("NOT_READY");
    expect(partial.blockingCount).toBe(1);
    expect(partial.warningCount).toBe(1);

    const ready = summarizeReadiness([
      { code: "A", status: "PASS" },
      { code: "B", status: "PASS" },
    ]);
    expect(ready.status).toBe("READY_FOR_BROKER");
  });
});
