// apps/frontend/src/components/ui/StatusBadge.tsx
//
// Generic status badge — distinct from RfqStateBadge (which is FSM-aware).
// Used by Dashboard widgets, Notification rows, etc.
//
import { type NotificationType } from "@dmx/contracts/notifications";
import { Badge, type BadgeTone } from "./Badge";

const TYPE_TO_TONE: Record<NotificationType, BadgeTone> = {
  INFO:    "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR:   "danger",
};

const TYPE_LABEL: Record<NotificationType, string> = {
  INFO: "Info", SUCCESS: "Success", WARNING: "Warning", ERROR: "Error",
};

export function StatusBadge({ type, label }: { type: NotificationType; label?: string }) {
  return <Badge tone={TYPE_TO_TONE[type]} dot data-testid={`status-badge-${type}`}>{label ?? TYPE_LABEL[type]}</Badge>;
}
