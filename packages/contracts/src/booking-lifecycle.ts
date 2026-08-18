/**
 * Sprint 32 — Operational booking lifecycle on ShipmentWorkspace (GLOBAL CORE).
 * Not a parallel Booking entity; statuses live on shipment_workspaces.booking_status.
 */

export const BOOKING_STATUSES = [
  "DRAFT",
  "REQUESTED",
  "PENDING",
  "CONFIRMED",
  "AMENDED",
  "CANCELLED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_SOURCES = [
  "MANUAL",
  "DEMAXTORE_OPERATIONS",
  "PARTNER",
  "CARRIER_API",
  "EDI",
  "SYSTEM",
] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

/** Explicit valid transitions — invalid transitions must be rejected. */
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  DRAFT: ["REQUESTED", "PENDING", "CONFIRMED", "CANCELLED"],
  REQUESTED: ["PENDING", "CONFIRMED", "CANCELLED"],
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["AMENDED", "CANCELLED"],
  AMENDED: ["CONFIRMED", "AMENDED", "CANCELLED"],
  CANCELLED: [], // no reopen unless future explicit rule
};

export function isBookingStatus(v: unknown): v is BookingStatus {
  return typeof v === "string" && (BOOKING_STATUSES as readonly string[]).includes(v);
}

export function canTransitionBooking(
  from: BookingStatus | null | undefined,
  to: BookingStatus,
): boolean {
  // First write onto legacy null: treat as DRAFT entrypoint
  const src = from ?? "DRAFT";
  if (src === to) return true; // idempotent same-status
  return (BOOKING_TRANSITIONS[src] ?? []).includes(to);
}

/** Forward Ops transitions excluding Cancel (Cancel has its own control). */
export function nextBookingStatuses(from: BookingStatus | null | undefined): BookingStatus[] {
  const src = from ?? "DRAFT";
  return (BOOKING_TRANSITIONS[src] ?? []).filter((s) => s !== "CANCELLED");
}

export function assertBookingTransition(
  from: BookingStatus | null | undefined,
  to: BookingStatus,
): void {
  if (!canTransitionBooking(from, to)) {
    throw new Error(`INVALID_BOOKING_TRANSITION:${from ?? "null"}→${to}`);
  }
}
