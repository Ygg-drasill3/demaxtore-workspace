import { describe, it, expect } from "vitest";
import { areRfqParticipantIdentitiesRevealed } from "@dmx/contracts/rfq-participants";
import { mapRfqParticipantsForViewer } from "./rfq-participants.js";

describe("rfq-participants", () => {
  const users = new Map([
    ["buyer-1", { displayName: "Buyer One", email: "buyer@test.com", organisation: { name: "Acme" } }],
    ["sup-1", { displayName: "Heni Foods", email: "heni@test.com", organisation: { name: "Heni Foods Ltd" } }],
    ["sup-2", { displayName: "Alkim", email: "alkim@test.com", organisation: null }],
  ]);

  it("masks counterparty names before RFQ is published", () => {
    const rows = mapRfqParticipantsForViewer({
      state: "SUPPLIERS_ASSIGNED",
      participants: [
        { userId: "buyer-1", participantRole: "OWNER" },
        { userId: "sup-1", participantRole: "COUNTERPARTY" },
        { userId: "sup-2", participantRole: "COUNTERPARTY" },
      ],
      users,
      viewerRole: "BUYER",
      viewerId: "buyer-1",
    });
    expect(rows.find((r) => r.userId === "buyer-1")?.name).toBe("Acme");
    expect(rows.find((r) => r.userId === "sup-1")).toMatchObject({
      name: "Supplier 1",
      identityRevealed: false,
    });
    expect(rows.find((r) => r.userId === "sup-2")?.name).toBe("Supplier 2");
  });

  it("reveals real names after publish (RFQ_OPEN)", () => {
    const rows = mapRfqParticipantsForViewer({
      state: "RFQ_OPEN",
      participants: [
        { userId: "buyer-1", participantRole: "OWNER" },
        { userId: "sup-1", participantRole: "COUNTERPARTY" },
      ],
      users,
      viewerRole: "BUYER",
      viewerId: "buyer-1",
    });
    expect(rows.find((r) => r.userId === "sup-1")?.name).toBe("Heni Foods Ltd");
    expect(rows.find((r) => r.userId === "sup-1")?.identityRevealed).toBe(true);
  });

  it("admin always sees identities before publish", () => {
    const rows = mapRfqParticipantsForViewer({
      state: "SUPPLIERS_ASSIGNED",
      participants: [{ userId: "sup-1", participantRole: "COUNTERPARTY" }],
      users,
      viewerRole: "ADMIN",
    });
    expect(rows[0]?.name).toBe("Heni Foods Ltd");
    expect(rows[0]?.email).toBe("heni@test.com");
  });

  it("areRfqParticipantIdentitiesRevealed tracks publish gate", () => {
    expect(areRfqParticipantIdentitiesRevealed("SUPPLIERS_ASSIGNED")).toBe(false);
    expect(areRfqParticipantIdentitiesRevealed("RFQ_OPEN")).toBe(true);
  });
});
