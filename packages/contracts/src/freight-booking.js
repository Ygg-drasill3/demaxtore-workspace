// Sprint 17B — FreightIQ Booking Engine (planning layer, not shipment execution)
export const CargoReadyForecastStatus = ["DRAFT", "ACTIVE", "REVISED"];
export const CargoReadyConfidenceLevel = ["HIGH", "MEDIUM", "LOW"];
export const FreightBookingStatus = [
    "PLANNING",
    "UNDER_REVIEW",
    "APPROVED",
    "BOOKED",
    "REBOOK_REQUIRED",
    "REBOOKED",
];
export const CarrierOptionStatus = ["AVAILABLE", "RECOMMENDED", "SELECTED", "EXPIRED"];
export const FREIGHT_BOOKING_TIMELINE_EVENTS = {
    PLAN_CREATED: "booking.plan_created",
    OPTION_ADDED: "booking.option_added",
    OPTION_SELECTED: "booking.option_selected",
    CONFIRMED: "booking.confirmed",
    REBOOK_REQUIRED: "booking.rebook_required",
    REBOOKED: "booking.rebooked",
};
//# sourceMappingURL=freight-booking.js.map