import { describe, it, expect } from "vitest";
import { PAYMENT_GATED_ORDER_ACTIONS } from "./payment-milestones.js";

describe("payment milestones", () => {
  it("gates production on deposit paid", () => {
    expect(PAYMENT_GATED_ORDER_ACTIONS.start_production).toBe("DEPOSIT_PAID");
  });

  it("gates delivery on balance paid", () => {
    expect(PAYMENT_GATED_ORDER_ACTIONS.mark_delivered).toBe("BALANCE_PAID");
  });
});
