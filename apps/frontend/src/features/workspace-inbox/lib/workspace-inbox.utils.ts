import type { InboxAttentionBadge } from "@dmx/contracts/workspace-inbox";

export const INBOX_FILTERS: Array<{ id: import("@dmx/contracts/workspace-inbox").InboxFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "rfq", label: "RFQ" },
  { id: "commoditybid", label: "CommodityBid" },
  { id: "purchase_orders", label: "Purchase Orders" },
  { id: "shipments", label: "Shipments" },
  { id: "completed", label: "Completed" },
  { id: "waiting_for_me", label: "Waiting For Me" },
  { id: "unread", label: "Unread" },
  { id: "delayed", label: "Delayed" },
  { id: "archived", label: "Archived" },
];

export const BADGE_STYLES: Record<InboxAttentionBadge, string> = {
  WAITING_REPLY: "bg-amber-100 text-amber-900 border-amber-200",
  APPROVAL_REQUIRED: "bg-rose-100 text-rose-900 border-rose-200",
  DELAYED: "bg-red-100 text-red-900 border-red-200",
  NEW_MESSAGE: "bg-blue-100 text-blue-900 border-blue-200",
  INSPECTION: "bg-orange-100 text-orange-900 border-orange-200",
  ETA_UPDATED: "bg-sky-100 text-sky-900 border-sky-200",
  COMPLETED: "bg-emerald-100 text-emerald-900 border-emerald-200",
};

export const BADGE_LABELS: Record<InboxAttentionBadge, string> = {
  WAITING_REPLY: "Waiting Reply",
  APPROVAL_REQUIRED: "Approval Required",
  DELAYED: "Delayed",
  NEW_MESSAGE: "New Message",
  INSPECTION: "Inspection",
  ETA_UPDATED: "ETA Updated",
  COMPLETED: "Completed",
};

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
