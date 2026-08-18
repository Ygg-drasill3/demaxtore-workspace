import { describe, expect, it } from "vitest";
import { computeCustomsBrokerAllowedActions } from "./customs-broker-execution.js";

describe("Sprint 39 broker execution allowed actions", () => {
  it("offers Start Review from DRAFT / PREPARING / READY_FOR_BROKER", () => {
    for (const status of ["DRAFT", "PREPARING", "READY_FOR_BROKER"]) {
      expect(
        computeCustomsBrokerAllowedActions({
          status,
          readinessStatus: "NOT_READY",
          blockingCount: 0,
          hasDeclarationRef: false,
        }),
      ).toContain("START_REVIEW");
    }
  });

  it("does not offer Start Review after review has started", () => {
    expect(
      computeCustomsBrokerAllowedActions({
        status: "BROKER_REVIEW",
        readinessStatus: "READY",
        blockingCount: 0,
        hasDeclarationRef: false,
      }),
    ).not.toContain("START_REVIEW");
  });

  it("keeps document / classification actions in review without exposing CLEARED mutation from DRAFT", () => {
    const draft = computeCustomsBrokerAllowedActions({
      status: "DRAFT",
      readinessStatus: "NOT_READY",
      blockingCount: 0,
      hasDeclarationRef: false,
    });
    expect(draft).not.toContain("MARK_CLEARED");
    const review = computeCustomsBrokerAllowedActions({
      status: "BROKER_REVIEW",
      readinessStatus: "READY",
      blockingCount: 0,
      hasDeclarationRef: false,
    });
    expect(review).toEqual(
      expect.arrayContaining([
        "REQUEST_DOCUMENT",
        "REQUEST_INFORMATION",
        "VERIFY_CLASSIFICATION",
        "START_DECLARATION_PREPARATION",
      ]),
    );
  });
});
