/**
 * Customer-facing status labels. Engine enums stay in the API; chrome never shows
 * BROKER_REVIEW / READY_FOR_PICKUP / NOT_READY raw.
 */
const STATUS_LABELS: Record<string, string> = {
  NOT_READY: "Documents needed",
  READY: "Ready",
  READY_FOR_CUSTOMS: "Ready for customs",
  BROKER_REVIEW: "With broker",
  DECLARATION_FILED: "Declaration filed",
  CUSTOMS_PROCESSING: "In customs",
  HOLD: "On hold",
  CLEARED: "Cleared",
  CANCELLED: "Cancelled",
  REQUESTED: "Requested",
  AWAITING_TRUCKER: "Finding trucker",
  PICKUP_SCHEDULED: "Pickup scheduled",
  READY_FOR_PICKUP: "Ready for pickup",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  POD_UPLOADED: "POD uploaded",
  POD_CONFIRMED: "POD confirmed",
  POD_PENDING: "POD pending",
  ESTIMATED: "Estimated",
  ACTUAL: "Actual",
  QUOTED: "Offers ready",
  CONVERTED_TO_SHIPMENT: "Booking in progress",
  OFFER_SELECTED: "Offer selected",
  // Exception categories
  ETA_CHANGE: "ETA changed",
  DELAY: "Delay",
  STALE_TRACKING: "Tracking outdated",
  MISSING_DOCUMENT: "Missing document",
  CUSTOMS_READINESS: "Customs readiness",
  CUSTOMS_ACTION: "Customs action needed",
  INLAND_DELIVERY: "Delivery issue",
  POD_MISSING: "POD missing",
  OPERATIONAL_DEADLINE: "Deadline at risk",
};

/** Import / shipment journey milestones shown on customer timelines. */
const TIMELINE_EVENT_LABELS: Record<string, string> = {
  BOOKING_CONFIRMED: "Booking confirmed",
  BOOKING_CREATED: "Booking created",
  CONTAINER_GATE_IN: "Container gate in",
  GATE_IN: "Container gate in",
  VESSEL_DEPARTED: "Vessel departed",
  DEPARTED: "Vessel departed",
  ETA_UPDATED: "ETA updated",
  VESSEL_ARRIVED: "Vessel arrived",
  ARRIVED: "Vessel arrived",
  DISCHARGED: "Discharged",
  CUSTOMS_STARTED: "Customs started",
  CUSTOMS_CLEARED: "Customs cleared",
  READY_FOR_PICKUP: "Ready for pickup",
  INLAND_DELIVERY: "Inland delivery",
  DELIVERED: "Delivered",
  POD_CONFIRMED: "POD confirmed",
  POD_UPLOADED: "POD uploaded",
  SHIPMENT_CREATED: "Shipment created",
  OFFER_SELECTED: "Freight offer selected",
  EXCEPTION_OPENED: "Issue opened",
  EXCEPTION_RESOLVED: "Issue resolved",
};

export function humanizeStatus(value: string | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const key = value.trim().toUpperCase().replace(/[.\s-]+/g, "_");
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  return value
    .replace(/[._]/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humanizeTimelineEvent(value: string | null | undefined, fallback = "Update"): string {
  if (!value) return fallback;
  const key = value.trim().toUpperCase().replace(/[.\s-]+/g, "_");
  if (TIMELINE_EVENT_LABELS[key]) return TIMELINE_EVENT_LABELS[key];
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  return value
    .replace(/[._]/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
