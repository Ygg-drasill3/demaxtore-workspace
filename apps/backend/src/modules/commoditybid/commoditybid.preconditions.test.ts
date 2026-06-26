import { describe, expect, it } from "vitest";
import { PRECONDITIONS } from "./commoditybid.preconditions.js";

describe("commoditybid FSM preconditions", () => {
  it("assertBidCurrencyMatchesWorkspace rejects mismatch", () => {
    expect(() =>
      PRECONDITIONS.assertBidCurrencyMatchesWorkspace({
        workspace: { currency: "USD" },
        payload: { currency: "EUR" },
        actor: { id: "x", role: "SUPPLIER" },
      }),
    ).toThrow();
  });

  it("assertDeadlineNotPassed rejects past deadline", () => {
    expect(() =>
      PRECONDITIONS.assertDeadlineNotPassed({
        workspace: { deadlineAt: new Date(Date.now() - 60_000).toISOString() },
        payload: {},
        actor: { id: "x", role: "SUPPLIER" },
      }),
    ).toThrow();
  });
});
