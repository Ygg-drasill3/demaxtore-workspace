import { describe, expect, it } from "vitest";
import { canCreateSupplierCustomerAccount } from "./sales-control";

describe("canCreateSupplierCustomerAccount", () => {
  it("allows sales control users to create supplier accounts", () => {
    expect(
      canCreateSupplierCustomerAccount({
        email: "sales@demaxtore.com",
        role: "SALES_CONTROL",
      }),
    ).toBe(true);
  });

  it("allows admins regardless of email", () => {
    expect(
      canCreateSupplierCustomerAccount({
        email: "admin@demaxtore.com",
        role: "ADMIN",
      }),
    ).toBe(true);
  });
});
