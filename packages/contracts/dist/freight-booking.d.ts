export declare const CargoReadyForecastStatus: readonly ["DRAFT", "ACTIVE", "REVISED"];
export type CargoReadyForecastStatus = (typeof CargoReadyForecastStatus)[number];
export declare const CargoReadyConfidenceLevel: readonly ["HIGH", "MEDIUM", "LOW"];
export type CargoReadyConfidenceLevel = (typeof CargoReadyConfidenceLevel)[number];
export declare const FreightBookingStatus: readonly ["PLANNING", "UNDER_REVIEW", "APPROVED", "BOOKED", "REBOOK_REQUIRED", "REBOOKED"];
export type FreightBookingStatus = (typeof FreightBookingStatus)[number];
export declare const CarrierOptionStatus: readonly ["AVAILABLE", "RECOMMENDED", "SELECTED", "EXPIRED"];
export type CarrierOptionStatus = (typeof CarrierOptionStatus)[number];
export declare const FREIGHT_BOOKING_TIMELINE_EVENTS: {
    readonly PLAN_CREATED: "booking.plan_created";
    readonly OPTION_ADDED: "booking.option_added";
    readonly OPTION_SELECTED: "booking.option_selected";
    readonly CONFIRMED: "booking.confirmed";
    readonly REBOOK_REQUIRED: "booking.rebook_required";
    readonly REBOOKED: "booking.rebooked";
};
export interface CargoReadyForecastDto {
    id: string;
    tradeId: string;
    supplierId: string;
    freightBookingId: string | null;
    productionStartDate: string;
    estimatedProductionFinishDate: string;
    estimatedCargoReadyDate: string;
    confidenceLevel: CargoReadyConfidenceLevel;
    notes: string | null;
    status: CargoReadyForecastStatus;
    createdAt: string;
    updatedAt: string;
}
export interface CarrierOptionDto {
    id: string;
    tradeId: string;
    freightBookingId: string;
    carrierName: string;
    vesselName: string;
    originPort: string;
    destinationPort: string;
    etd: string;
    eta: string;
    transitDays: number;
    cutoffDate: string;
    freightAmount: number;
    currency: string;
    recommendationScore: number;
    status: CarrierOptionStatus;
}
/** Buyer/supplier trimmed view — no freight amounts or scores. */
export interface CarrierOptionSummaryDto {
    id: string;
    carrierName: string;
    vesselName: string;
    etd: string;
    eta: string;
    transitDays: number;
    cutoffDate: string;
    status: CarrierOptionStatus;
}
export interface FreightBookingDto {
    id: string;
    tradeId: string;
    supplierId: string;
    status: FreightBookingStatus;
    selectedCarrierOptionId: string | null;
    approvedAt: string | null;
    confirmedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface FreightBookingPanelDto {
    forecast: CargoReadyForecastDto | null;
    booking: FreightBookingDto | null;
    carrierOptions: CarrierOptionDto[];
    recommendedOption: CarrierOptionDto | null;
    selectedOption: CarrierOptionDto | null;
    bestOverallLabel: string | null;
}
/** Supplier-facing panel — forecast + status only. */
export interface FreightBookingSupplierPanelDto {
    forecast: CargoReadyForecastDto | null;
    bookingStatus: FreightBookingStatus | null;
    selectedCarrierName: string | null;
    selectedVesselName: string | null;
    selectedTransitDays: number | null;
}
export interface FreightBookingKpiDto {
    bookingsPending: number;
    bookingsConfirmed: number;
    cutoffRisks: number;
    forecastChanges: number;
    rebookRequired: number;
}
