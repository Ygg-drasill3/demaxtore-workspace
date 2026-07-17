/** Canonical delivery status model — monotonic transitions only. */
export type CanonicalDeliveryStatus =
  | "PENDING"
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

const STATUS_RANK: Record<CanonicalDeliveryStatus, number> = {
  PENDING: 0,
  QUEUED: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  FAILED: 5,
};

export function mapWhatsAppStatusToCanonical(raw: string): CanonicalDeliveryStatus {
  const s = raw.toLowerCase();
  if (s === "failed" || s === "error") return "FAILED";
  if (s === "read") return "READ";
  if (s === "delivered") return "DELIVERED";
  if (s === "sent") return "SENT";
  if (s === "queued" || s === "accepted") return "QUEUED";
  return "PENDING";
}

export function mergeCanonicalStatus(
  current: CanonicalDeliveryStatus | null,
  incoming: CanonicalDeliveryStatus,
): CanonicalDeliveryStatus {
  if (!current) return incoming;
  if (current === "FAILED" || incoming === "FAILED") return "FAILED";
  return STATUS_RANK[incoming] >= STATUS_RANK[current] ? incoming : current;
}

export function canonicalStatusDistribution(
  statuses: CanonicalDeliveryStatus[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of statuses) {
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}

export function resolveWhatsAppMessageCanonical(
  message: {
    status: string;
    sentAt?: Date | null;
    deliveredAt?: Date | null;
    readAt?: Date | null;
    failedAt?: Date | null;
  },
): CanonicalDeliveryStatus {
  if (message.failedAt) return "FAILED";
  const fromStatus = mapWhatsAppStatusToCanonical(message.status);
  if (fromStatus === "FAILED") return "FAILED";
  if (message.readAt || fromStatus === "READ") return "READ";
  if (message.deliveredAt || fromStatus === "DELIVERED") return "DELIVERED";
  if (message.sentAt || fromStatus === "SENT" || fromStatus === "QUEUED") {
    return message.sentAt || fromStatus === "SENT" ? "SENT" : "QUEUED";
  }
  return fromStatus;
}

/** One bucket per message — highest canonical status only. */
export function canonicalStatusDistributionFromMessages(
  messages: Array<{
    status: string;
    sentAt?: Date | null;
    deliveredAt?: Date | null;
    readAt?: Date | null;
    failedAt?: Date | null;
  }>,
): Record<string, number> {
  return canonicalStatusDistribution(messages.map(resolveWhatsAppMessageCanonical));
}
