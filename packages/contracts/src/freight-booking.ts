// Sprint 17B — FreightIQ Booking Engine (planning layer, not shipment execution)

export const CargoReadyForecastStatus = ["DRAFT", "ACTIVE", "REVISED"] as const;
export type CargoReadyForecastStatus = (typeof CargoReadyForecastStatus)[number];

export const CargoReadyConfidenceLevel = ["HIGH", "MEDIUM", "LOW"] as const;
export type CargoReadyConfidenceLevel = (typeof CargoReadyConfidenceLevel)[number];

export const FreightBookingStatus = [
  "PLANNING",
  "UNDER_REVIEW",
  "APPROVED",
  "BOOKED",
  "REBOOK_REQUIRED",
  "REBOOKED",
] as const;
export type FreightBookingStatus = (typeof FreightBookingStatus)[number];

export const CarrierOptionStatus = ["AVAILABLE", "RECOMMENDED", "SELECTED", "EXPIRED"] as const;
export type CarrierOptionStatus = (typeof CarrierOptionStatus)[number];

export const FREIGHT_BOOKING_TIMELINE_EVENTS = {
  PLAN_CREATED: "booking.plan_created",
  OPTION_ADDED: "booking.option_added",
  OPTION_SELECTED: "booking.option_selected",
  CONFIRMED: "booking.confirmed",
  REBOOK_REQUIRED: "booking.rebook_required",
  REBOOKED: "booking.rebooked",
} as const;

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
