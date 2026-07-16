import { describe, it, expect } from "vitest";
import { CreateMessagePayload, MessageSearchQuerySchema } from "./workspace-communication.zod";

describe("workspace-communication zod", () => {
  it("accepts create message payload", () => {
    const p = CreateMessagePayload.parse({
      body: "Please confirm lead time",
      messageType: "QUESTION",
      visibility: "ALL_PARTICIPANTS",
    });
    expect(p.messageType).toBe("QUESTION");
  });

  it("rejects empty body", () => {
    expect(() => CreateMessagePayload.parse({ body: "" })).toThrow();
  });

  it("parses search query", () => {
    const q = MessageSearchQuerySchema.parse({ mentionedMe: true, limit: 10 });
    expect(q.mentionedMe).toBe(true);
  });

  it("accepts optional clientMessageId for idempotent sends (MSG-001)", () => {
    const id = "22222222-2222-4222-8222-222222222222";
    const p = CreateMessagePayload.parse({
      body: "Once",
      clientMessageId: id,
    });
    expect(p.clientMessageId).toBe(id);
  });
});
