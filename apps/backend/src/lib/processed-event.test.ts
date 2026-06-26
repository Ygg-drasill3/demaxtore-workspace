import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { claimProcessedEvent, releaseProcessedEvent } from "./processed-event.js";

describe("claimProcessedEvent", () => {
  const create = vi.fn();

  beforeEach(() => {
    create.mockReset();
  });

  it("returns true on first claim", async () => {
    create.mockResolvedValue({ id: "1" });
    const db = { processedEvent: { create } } as never;
    const ok = await claimProcessedEvent(db, { source: "test", eventId: "evt-1" });
    expect(ok).toBe(true);
    expect(create).toHaveBeenCalledOnce();
  });

  it("returns false on duplicate unique violation", async () => {
    const err = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "5.18.0",
    });
    create.mockRejectedValue(err);
    const db = { processedEvent: { create } } as never;
    const ok = await claimProcessedEvent(db, { source: "test", eventId: "evt-1" });
    expect(ok).toBe(false);
  });

  it("replay of same eventId is not claimed twice", async () => {
    create.mockResolvedValueOnce({ id: "1" });
    const err = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "5.18.0",
    });
    create.mockRejectedValueOnce(err);
    const db = { processedEvent: { create } } as never;
    expect(await claimProcessedEvent(db, { source: "webhook:payment", eventId: "evt-replay" })).toBe(true);
    expect(await claimProcessedEvent(db, { source: "webhook:payment", eventId: "evt-replay" })).toBe(false);
  });
});

describe("releaseProcessedEvent (C4/C6)", () => {
  it("deletes the claim so a failed attempt can be retried", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = { processedEvent: { deleteMany } } as never;
    await releaseProcessedEvent(db, "webhook:payment", "evt-1");
    expect(deleteMany).toHaveBeenCalledWith({ where: { source: "webhook:payment", eventId: "evt-1" } });
  });
});
