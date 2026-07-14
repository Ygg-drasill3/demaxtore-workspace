import { describe, it, expect } from "vitest";
import {
  buildAttachmentLibrary,
  buildDecisionLog,
  buildPendingActions,
} from "./conversation-hub.operational.js";
import type { TimelineItem } from "@dmx/contracts/conversation-hub";

function item(partial: Partial<TimelineItem> & Pick<TimelineItem, "id" | "body" | "createdAt">): TimelineItem {
  return {
    conversationId: "c1",
    itemType: "MESSAGE",
    authorUserId: "u1",
    authorName: "User",
    authorRole: "BUYER",
    visibility: "ALL_PARTICIPANTS",
    channelSource: "WORKSPACE",
    isSystemEvent: false,
    systemEventType: null,
    metadata: {},
    parentMessageId: null,
    attachments: [],
    deliveryStatuses: [],
    mentions: [],
    pinned: false,
    pinnedAt: null,
    editedAt: null,
    readByMe: false,
    ...partial,
  };
}

describe("conversation-hub.operational", () => {
  it("builds pending actions from unanswered questions", () => {
    const timeline = [
      item({ id: "q1", body: "What is lead time?", createdAt: "2026-01-01T10:00:00Z", itemType: "QUESTION" }),
    ];
    const actions = buildPendingActions(timeline);
    expect(actions.some((a) => a.kind === "UNANSWERED_QUESTION")).toBe(true);
  });

  it("categorizes attachments in library", () => {
    const timeline = [
      item({
        id: "d1",
        body: "PO doc",
        createdAt: "2026-01-02T10:00:00Z",
        itemType: "DOCUMENT",
        attachments: [
          {
            id: "a1",
            fileName: "PO-12345.pdf",
            mimeType: "application/pdf",
            fileSizeBytes: 1000,
            uploadedAt: "2026-01-02T10:00:00Z",
          },
        ],
      }),
    ];
    const lib = buildAttachmentLibrary(timeline);
    expect(lib.totalCount).toBe(1);
    expect(lib.categories[0]?.category).toBe("PURCHASE_ORDER");
  });

  it("extracts decision log from approvals and system events", () => {
    const timeline = [
      item({
        id: "s1",
        body: "Supplier selected",
        createdAt: "2026-01-03T10:00:00Z",
        isSystemEvent: true,
        itemType: "SYSTEM_EVENT",
        systemEventType: "SUPPLIER_SELECTED",
        authorUserId: null,
      }),
      item({
        id: "a1",
        body: "Approved terms",
        createdAt: "2026-01-04T10:00:00Z",
        itemType: "APPROVAL",
      }),
    ];
    const decisions = buildDecisionLog(timeline);
    expect(decisions.length).toBe(2);
    expect(decisions[0].title).toBe("Approval Recorded");
  });
});
