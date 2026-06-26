import { describe, expect, it } from "vitest";
import { canCreateSupplierCustomerAccount } from "./sales-control";

describe("canCreateSupplierCustomerAccount", () => {
  it("blocks ilham from creating supplier accounts", () => {
    expect(
      canCreateSupplierCustomerAccount({
        email: "ilham@demaxtore.com",
        role: "SALES_CONTROL",
      }),
    ).toBe(false);
  });

  it("still allows buyer creation users and admins", () => {
    expect(
      canCreateSupplierCustomerAccount({
        email: "someone@demaxtore.com",
        role: "SALES_CONTROL",
      }),
    ).toBe(true);

    expect(
      canCreateSupplierCustomerAccount({
        email: "ilham@demaxtore.com",
        role: "ADMIN",
      }),
    ).toBe(true);
  });
});
