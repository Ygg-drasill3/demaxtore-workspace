import type { EmailDeliveryStatus } from "@dmx/contracts/email-notification-bridge";

const VALID: Record<EmailDeliveryStatus, readonly EmailDeliveryStatus[]> = {
  QUEUED:    ["SENT", "FAILED"],
  SENT:      ["DELIVERED", "FAILED", "OPENED"],
  DELIVERED: ["OPENED"],
  OPENED:    ["OPENED"],
  FAILED:    ["FAILED", "SENT"],
};

/** Returns the next status if transition is allowed, otherwise null. */
export function nextDeliveryStatus(
  current: string,
  target: EmailDeliveryStatus,
): EmailDeliveryStatus | null {
  const allowed = VALID[current as EmailDeliveryStatus];
  if (!allowed?.includes(target)) return null;
  return target;
}

export function canTransitionDeliveryStatus(current: string, target: EmailDeliveryStatus): boolean {
  return nextDeliveryStatus(current, target) !== null;
}
