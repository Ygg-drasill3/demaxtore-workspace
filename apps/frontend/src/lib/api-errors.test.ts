import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "./api-errors";

describe("getApiErrorMessage", () => {
  it("explains deposit gate instead of a raw 409", () => {
    const err = {
      response: {
        status: 409,
        data: { error: { code: "PAYMENT_MILESTONE_REQUIRED", message: "Payment milestone required" } },
      },
    };
    expect(getApiErrorMessage(err)).toMatch(/deposit/i);
  });
});
