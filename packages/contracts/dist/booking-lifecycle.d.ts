/**
 * Sprint 32 — Operational booking lifecycle on ShipmentWorkspace (GLOBAL CORE).
 * Not a parallel Booking entity; statuses live on shipment_workspaces.booking_status.
 */
export declare const BOOKING_STATUSES: readonly ["DRAFT", "REQUESTED", "PENDING", "CONFIRMED", "AMENDED", "CANCELLED"];
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export declare const BOOKING_SOURCES: readonly ["MANUAL", "DEMAXTORE_OPERATIONS", "PARTNER", "CARRIER_API", "EDI", "SYSTEM"];
export type BookingSource = (typeof BOOKING_SOURCES)[number];
/** Explicit valid transitions — invalid transitions must be rejected. */
export declare const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]>;
export declare function isBookingStatus(v: unknown): v is BookingStatus;
export declare function canTransitionBooking(from: BookingStatus | null | undefined, to: BookingStatus): boolean;
/** Forward Ops transitions excluding Cancel (Cancel has its own control). */
export declare function nextBookingStatuses(from: BookingStatus | null | undefined): BookingStatus[];
export declare function assertBookingTransition(from: BookingStatus | null | undefined, to: BookingStatus): void;
