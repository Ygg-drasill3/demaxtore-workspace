import { describe, expect, it } from "vitest";
import { AppError } from "../../utils/httpErrors.js";
import { PRECONDITIONS } from "./order.preconditions.js";

const actor = { id: "u1", role: "SUPPLIER" as const };

function expectPrecondition(code: string, fn: () => void) {
  try {
    fn();
    expect.fail("expected precondition to throw");
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    expect((e as AppError).code).toBe(code);
  }
}

describe("order production preconditions", () => {
  it("assertProgressBelow100 rejects 100%", () => {
    expectPrecondition("PRODUCTION_USE_COMPLETE_ACTION", () =>
      PRECONDITIONS.assertProgressBelow100!({ workspace: {}, payload: { percentage: 100 }, actor }),
    );
  });

  it("assertProgressBelow100 allows partial progress", () => {
    expect(() =>
      PRECONDITIONS.assertProgressBelow100!({ workspace: {}, payload: { percentage: 50 }, actor }),
    ).not.toThrow();
  });

  it("assertLatestProductionPercent100 passes when payload is 100%", () => {
    expect(() =>
      PRECONDITIONS.assertLatestProductionPercent100!({ workspace: {}, payload: { percentage: 100 }, actor }),
    ).not.toThrow();
  });

  it("assertLatestProductionPercent100 rejects when latest update is below 100%", () => {
    expectPrecondition("PRODUCTION_NOT_100_PERCENT", () =>
      PRECONDITIONS.assertLatestProductionPercent100!({
        workspace: { orderStatusUpdates: [{ updateType: "PRODUCTION", percentage: 50 }] },
        payload: {},
        actor,
      }),
    );
  });

  it("assertFreightCoordinationReady rejects open request without selection", () => {
    expectPrecondition("FREIGHT_OFFER_NOT_SELECTED", () =>
      PRECONDITIONS.assertFreightCoordinationReady!({
        workspace: {
          freightRequests: [{ status: "REQUESTED", selection: null }],
        },
        payload: {},
        actor: { id: "u1", role: "ADMIN" },
      }),
    );
  });

  it("assertFreightCoordinationReady allows selected offer", () => {
    expect(() =>
      PRECONDITIONS.assertFreightCoordinationReady!({
        workspace: {
          freightRequests: [{ status: "REQUESTED", selection: { id: "sel-1" } }],
        },
        payload: {},
        actor: { id: "u1", role: "ADMIN" },
      }),
    ).not.toThrow();
  });

  it("assertFreightCoordinationReady allows no open freight request", () => {
    expect(() =>
      PRECONDITIONS.assertFreightCoordinationReady!({
        workspace: { freightRequests: [] },
        payload: {},
        actor: { id: "u1", role: "ADMIN" },
      }),
    ).not.toThrow();
  });
});
