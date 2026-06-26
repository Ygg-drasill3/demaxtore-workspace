import { describe, it, expect, vi, beforeEach } from "vitest";
import { TradeChatService } from "./chat.service.js";

describe("TradeChatService ingestInbound idempotency", () => {
  const db = {
    directMessage: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    directConversation: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: { findMany: vi.fn().mockResolvedValue([]) },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns duplicate without creating new message", async () => {
    db.directMessage.findFirst.mockResolvedValue({
      id: "existing-msg",
      conversationId: "conv-1",
    });

    const svc = new TradeChatService(db as never);
    const result = await svc.ingestInbound("905321234567", "Hi", "wamid.dup");

    expect(result).toEqual({
      conversationId: "conv-1",
      messageId: "existing-msg",
      duplicate: true,
    });
    expect(db.directMessage.create).not.toHaveBeenCalled();
  });
});
