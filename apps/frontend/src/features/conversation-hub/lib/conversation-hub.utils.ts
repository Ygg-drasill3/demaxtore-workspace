import type { TimelineFilter } from "./conversation-hub.types";
import type { TimelineItem, TimelineItemType } from "@dmx/contracts/conversation-hub";

export function filterTimeline(items: TimelineItem[], filter: TimelineFilter): TimelineItem[] {
  switch (filter) {
    case "messages":
      return items.filter((t) => t.itemType === "MESSAGE" && !t.isSystemEvent);
    case "documents":
      return items.filter((t) => t.itemType === "DOCUMENT" || t.attachments.length > 0);
    case "system":
      return items.filter((t) => t.isSystemEvent);
    case "decisions":
      return items.filter((t) => t.itemType === "DECISION");
    case "approvals":
      return items.filter((t) => t.itemType === "APPROVAL");
    case "questions":
      return items.filter((t) => t.itemType === "QUESTION" || t.itemType === "ANSWER");
    case "unread":
      return items.filter((t) => !t.readByMe && !t.isSystemEvent);
    case "attachments":
      return items.filter((t) => t.attachments.length > 0);
    default:
      return items;
  }
}

export const TIMELINE_FILTERS: Array<{ id: TimelineFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "messages", label: "Messages" },
  { id: "documents", label: "Documents" },
  { id: "system", label: "System Events" },
  { id: "decisions", label: "Decisions" },
  { id: "approvals", label: "Approvals" },
  { id: "questions", label: "Questions" },
  { id: "unread", label: "Unread" },
  { id: "attachments", label: "Attachments" },
];

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function deliveryLabel(item: TimelineItem, myUserId?: string) {
  if (item.isSystemEvent || !item.authorUserId || item.authorUserId !== myUserId) return null;
  const statuses = item.deliveryStatuses.filter((d) => d.userId !== myUserId);
  if (statuses.some((d) => d.state === "READ")) return "Read";
  if (statuses.some((d) => d.state === "DELIVERED")) return "Delivered";
  if (statuses.length > 0) return "Sent";
  return "Sent";
}

export const TYPE_LABELS: Record<TimelineItemType, string> = {
  MESSAGE: "Message",
  DOCUMENT: "Document",
  QUESTION: "Question",
  ANSWER: "Answer",
  DECISION: "Decision",
  APPROVAL: "Approval",
  ACTION_REQUIRED: "Action required",
  SYSTEM_EVENT: "System event",
  STATUS_UPDATE: "Status update",
  INTERNAL_NOTE: "Internal note",
};

export const ROLE_MENTION_TOKENS = ["@Buyer", "@Supplier", "@DeMaxtore"] as const;
