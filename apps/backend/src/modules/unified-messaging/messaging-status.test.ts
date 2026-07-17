import { describe, it, expect } from "vitest";
import {
  mergeCanonicalStatus,
  mapWhatsAppStatusToCanonical,
  resolveWhatsAppMessageCanonical,
} from "./messaging-status.js";

describe("messaging-status", () => {
  it("maps whatsapp raw status to canonical", () => {
    expect(mapWhatsAppStatusToCanonical("delivered")).toBe("DELIVERED");
    expect(mapWhatsAppStatusToCanonical("read")).toBe("READ");
  });

  it("does not downgrade READ to DELIVERED", () => {
    expect(mergeCanonicalStatus("READ", "DELIVERED")).toBe("READ");
  });

  it("resolves canonical from timestamps", () => {
    expect(
      resolveWhatsAppMessageCanonical({
        status: "sent",
        readAt: new Date(),
      }),
    ).toBe("READ");
  });
});
