import type { NotificationCategory, NotificationPriority } from "@dmx/contracts/notification-center";

export const NOTIFICATION_CATEGORIES: { id: NotificationCategory; labelKey: string }[] = [
  { id: "ALL",        labelKey: "nc.filter.all" },
  { id: "UNREAD",     labelKey: "nc.filter.unread" },
  { id: "MESSAGES",   labelKey: "nc.filter.messages" },
  { id: "APPROVALS",  labelKey: "nc.filter.approvals" },
  { id: "DOCUMENTS",  labelKey: "nc.filter.documents" },
  { id: "INSPECTION", labelKey: "nc.filter.inspection" },
  { id: "SHIPMENT",   labelKey: "nc.filter.shipment" },
  { id: "WORKSPACE",  labelKey: "nc.filter.workspace" },
  { id: "SYSTEM",     labelKey: "nc.filter.system" },
  { id: "ARCHIVED",   labelKey: "nc.filter.archived" },
];

export const PRIORITY_STYLES: Record<NotificationPriority, string> = {
  CRITICAL:     "border-l-red-600 bg-red-50/60",
  HIGH:         "border-l-amber-500 bg-amber-50/50",
  NORMAL:       "border-l-sky-500 bg-white",
  INFORMATION:  "border-l-zinc-300 bg-white",
};

export const PRIORITY_BADGE: Record<NotificationPriority, string> = {
  CRITICAL:    "bg-red-600 text-white",
  HIGH:        "bg-amber-500 text-white",
  NORMAL:      "bg-sky-600 text-white",
  INFORMATION: "bg-zinc-400 text-white",
};

export function centerTypeLabel(type: string): string {
  return type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
