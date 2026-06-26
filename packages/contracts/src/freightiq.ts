// =============================================================================
// Sprint 5A — FreightIQ (freight coordination layer; not a marketplace)
// =============================================================================

export const FreightMode = ["OCEAN_FCL", "OCEAN_LCL", "ROAD", "RAIL", "AIR"] as const;
export type FreightMode = (typeof FreightMode)[number];

export const FreightStatus = [
  "REQUESTED",
  "QUOTING",
  "QUOTED",
  "SELECTED",
  "EXPIRED",
  "CANCELLED",
  "CONVERTED_TO_SHIPMENT",
] as const;
export type FreightStatus = (typeof FreightStatus)[number];

export const FreightOfferStatus = ["ACTIVE", "REVISED", "WITHDRAWN", "EXPIRED", "SELECTED"] as const;
export type FreightOfferStatus = (typeof FreightOfferStatus)[number];

export const FreightAction = [
  "create_request",
  "submit_offer",
  "revise_offer",
  "withdraw_offer",
  "select_offer",
  "cancel_request",
] as const;
export type FreightAction = (typeof FreightAction)[number];

/** Order states where FreightIQ request creation is allowed (no Order FSM edits). */
export const FREIGHTIQ_ORDER_ELIGIBLE_STATES = [
  "PRODUCTION_COMPLETED",
  "INSPECTION_COMPLETED",
  "FREIGHT_REQUESTED",
] as const;

/** Order states where freight intake must not run (even for admin). */
export const FREIGHTIQ_ORDER_TERMINAL_STATES = ["CLOSED", "CANCELLED", "DISPUTED", "REJECTED"] as const;

/** Buyer/supplier vs admin eligibility for opening a freight request. */
export function isFreightIntakeEligible(
  state: string,
  role: "BUYER" | "SUPPLIER" | "ADMIN" | "SALES_CONTROL" | "SYSTEM" = "BUYER",
): boolean {
  if ((FREIGHTIQ_ORDER_TERMINAL_STATES as readonly string[]).includes(state)) return false;
  if (role === "ADMIN" || role === "SYSTEM" || role === "SALES_CONTROL") return true;
  return (FREIGHTIQ_ORDER_ELIGIBLE_STATES as readonly string[]).includes(state);
}

export interface FreightLane {
  pol: string;
  pod: string;
  mode: FreightMode;
}

export interface FreightProvider {
  name: string;
  carrierName: string;
}

export interface FreightOffer {
  id: string;
  freightRequestId: string;
  providerName: string;
  carrierName: string;
  /** Display price shown to buyer/supplier (USD equivalent for comparison). */
  price: number;
  currency: string;
  /** Sprint 6A — admin-only commercial breakdown */
  commercial?: import("./freight-commercial").FreightMargin;
  transitDays: number;
  validUntil: string;
  remarks: string | null;
  status: FreightOfferStatus;
  createdAt: string;
  updatedAt: string;
  /** Sprint 5B — optional intake metadata */
  forwarderContactId?: string | null;
  forwarderCompanyName?: string | null;
  offerSource?: string | null;
  vesselName?: string | null;
  etd?: string | null;
  eta?: string | null;
  cutOff?: string | null;
}

export interface FreightSelection {
  id: string;
  freightRequestId: string;
  offerId: string;
  selectedById: string;
  selectedAt: string;
  shipmentWorkspaceId: string | null;
}

export interface FreightRequest {
  id: string;
  orderId: string;
  orderRef: string | null;
  buyerId: string;
  supplierId: string;
  mode: FreightMode;
  pol: string;
  pod: string;
  cargoDescription: string;
  containerType: string | null;
  readyDate: string | null;
  status: FreightStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FreightSummary {
  orderId: string;
  request: FreightRequest | null;
  offers: FreightOffer[];
  selection: FreightSelection | null;
  comparisonHints: {
    lowestPriceOfferId: string | null;
    fastestTransitOfferId: string | null;
    earliestEtdOfferId?: string | null;
    closestCutOffOfferId?: string | null;
    expiringSoonOfferIds: string[];
  };
  /** Sprint 5B — forwarder communications on active request */
  communications?: import("./freight-communications").FreightRequestCommunication[];
  emailTemplate?: import("./freight-communications").FreightRequestEmailTemplate | null;
  /** Sprint 6A — FOB + freight → estimated CIF (no margin exposed) */
  commercialSummary?: import("./freight-commercial").FreightCommercialSummary | null;
  /** Sprint 6B — suggested margin on intake (admin only) */
  marginIntakeHint?: import("./freight-analytics").MarginPolicySuggestion | null;
}

export interface FreightOpsOverview {
  openRequests: Array<FreightRequest & { offerCount: number }>;
  pendingOffers: FreightOffer[];
  expiredOffers: FreightOffer[];
  selectedFreight: Array<FreightRequest & { selection: FreightSelection }>;
  /** Sprint 5B */
  pendingCommunications?: import("./freight-communications").FreightRequestCommunication[];
  waitingResponses?: import("./freight-communications").FreightRequestCommunication[];
  /** Sprint 6A — FreightIQ commercial KPIs */
  commercialMetrics?: import("./freight-commercial").FreightCommercialMetrics;
}
