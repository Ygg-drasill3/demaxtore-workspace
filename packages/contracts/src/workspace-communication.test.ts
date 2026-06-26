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
});
