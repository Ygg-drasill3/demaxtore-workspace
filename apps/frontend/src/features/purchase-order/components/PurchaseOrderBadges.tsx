import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { canonicalizePurchaseOrderStatus } from "@dmx/contracts/purchase-order";
import {
  purchaseOrderSourceLabel,
  purchaseOrderStatusLabel,
  type PurchaseOrderStatus,
} from "../lib/purchase-order.labels";

const STATUS_TONE: Record<PurchaseOrderStatus, BadgeTone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  APPROVED: "success",
  IN_EXECUTION: "accent",
  COMPLETED: "success",
  CLOSED: "neutral",
  CANCELLED: "danger",
};

export function PurchaseOrderStatusBadge({
  status,
}: {
  status: string;
}) {
  const key = canonicalizePurchaseOrderStatus(status);
  const tone = STATUS_TONE[key] ?? "neutral";
  const label = purchaseOrderStatusLabel(status);
  return (
    <Badge tone={tone} data-testid="po-status-badge" aria-label={`Status: ${label}`}>
      {label}
    </Badge>
  );
}

export function PurchaseOrderSourceBadge({
  source,
}: {
  source: string | null | undefined;
}) {
  const label = purchaseOrderSourceLabel(source);
  return (
    <Badge tone="neutral" data-testid="po-source-badge" aria-label={`Source: ${label}`}>
      {label}
    </Badge>
  );
}
