import { describe, it, expect } from "vitest";
import { FreightAction } from "@dmx/contracts/freightiq";
import { assertFreightActionRole } from "./freightiq.policy.js";

const ROLES = ["ADMIN", "BUYER", "SUPPLIER", "BROKER", "TRUCKER"] as const;

describe("freight action authorization", () => {
  it("every contract action has a role rule", () => {
    for (const action of FreightAction) {
      const allowed = ROLES.filter((role) => {
        try {
          assertFreightActionRole(action, role as never);
          return true;
        } catch (err) {
          // A missing rule dereferences undefined instead of denying by role.
          expect(String(err)).toContain("FORBIDDEN_ROLE");
          return false;
        }
      });
      expect(allowed.length).toBeGreaterThan(0);
    }
  });

  it("proceed_to_booking is limited to the buyer and admin", () => {
    expect(() => assertFreightActionRole("proceed_to_booking", "BUYER" as never)).not.toThrow();
    expect(() => assertFreightActionRole("proceed_to_booking", "ADMIN" as never)).not.toThrow();
    for (const role of ["SUPPLIER", "BROKER", "TRUCKER"] as const) {
      expect(() => assertFreightActionRole("proceed_to_booking", role as never)).toThrow(
        "FORBIDDEN_ROLE",
      );
    }
  });

  it("offer submission stays with the supplier side", () => {
    expect(() => assertFreightActionRole("submit_offer", "BUYER" as never)).toThrow();
    expect(() => assertFreightActionRole("submit_offer", "SUPPLIER" as never)).not.toThrow();
  });
});
