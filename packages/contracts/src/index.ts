// =============================================================================
// @dmx/contracts — barrel
// =============================================================================
// `rfq.fsm.ts` and `notifications.ts` both export a `NotificationType`. The
// FSM type is the broader internal enum used inside transitions; the public DTO
// type is the zod-validated one. Re-exporting both as default would conflict —
// so we expose the FSM one under a namespaced alias.
export {
  type NotificationType as FsmNotificationType,
} from "./rfq.fsm";
export {
  RFQ_TRANSITIONS, RFQ_TERMINAL_STATES, isRfqTerminal, findRfqTransition,
  type RfqState, type RfqAction, type RfqTransition,
  type ActorRole, type ParticipantConstraint, type NotifySpec,
} from "./rfq.fsm";
export * from "./rfq.next-actions";
export * from "./rfq.zod";
export * from "./catalog-rfq-intake";
export {
  COMMODITYBID_TRANSITIONS, COMMODITYBID_TERMINAL_STATES, isCommodityBidTerminal, findCommodityBidTransition,
  type CommodityBidState, type CommodityBidAction, type CommodityBidTransition,
} from "./commoditybid.fsm";
export { computeCommodityBidNextActions, type CommodityBidNextActionContext } from "./commoditybid.next-actions";
export * from "./commoditybid.scripts";
export {
  CreateCommodityBidDraftInput, InviteSuppliersPayload, DraftAwardLotPayload,
  PublishAwardsPayload, SubmitBidLotPayload, ListCommodityBidQuery,
} from "./commoditybid.zod";
export {
  ORDER_TRANSITIONS, ORDER_TERMINAL_STATES, ORDER_ACTIVE_STATES,
  isOrderTerminal, isOrderActive, findOrderTransition, resolveOrderTargetState,
  type OrderState, type OrderAction, type OrderTransition,
} from "./order.fsm";
export { computeOrderNextActions, type OrderNextActionContext } from "./order.next-actions";
export {
  SupplierConfirmOrderPayload, StartProductionPayload, ReportProductionProgressPayload,
  RequestInspectionPayload, RecordInspectionResultPayload, BookShipmentPayload,
  MarkDepartedPayload, UpdateEtaPayload, MarkArrivedPayload, CloseOrderPayload,
  OpenDisputePayload, UploadOrderDocumentPayload,
  ListOrderQuery, OrderListItem,
} from "./order.zod";
export {
  SHIPMENT_TRANSITIONS, SHIPMENT_TERMINAL_STATES, SHIPMENT_ACTIVE_STATES,
  isShipmentTerminal, isShipmentActive, findShipmentTransition, resolveShipmentTargetState,
  type ShipmentState, type ShipmentAction, type ShipmentTransition,
} from "./shipment.fsm";
export { computeShipmentNextActions, type ShipmentNextActionContext } from "./shipment.next-actions";
export {
  ConfirmBookingPayload, AssignContainerPayload, LoadVesselPayload,
  ReportExceptionPayload, ResolveExceptionPayload, CancelShipmentPayload,
  UploadShipmentDocumentPayload,
} from "./shipment.zod";
export * from "./auth";
export * from "./sales-control";
export * from "./notifications";
export * from "./socket-events";
export * from "./api";
export * from "./telemetry";
export * from "./supplier-activity";
export * from "./control-tower";
export * from "./control-tower.zod";
export * from "./activity-days";
export * from "./shipment-tracking";
export * from "./shipment-tracking.zod";
export * from "./freightiq";
export * from "./freightiq.zod";
export * from "./workspace-scripts";
export * from "./order.scripts";
export * from "./freightiq.scripts";
export * from "./shipment.scripts";
export * from "./freight-communications";
export * from "./freight-communications.zod";
export * from "./freight-shippers";
export * from "./freight-shippers.zod";
export * from "./freight-commercial";
export { SetFreightMarginPayload } from "./freight-commercial.zod";
export * from "./freight-analytics";
export * from "./freight-analytics.zod";
export * from "./scale-readiness";
export * from "./scale-readiness.zod";
export * from "./commercial-funnel";
export * from "./market-intelligence";
export * from "./enterprise-readiness";
export * from "./trade-documents";
export * from "./trade-documents.zod";
export * from "./document-requirements";
export * from "./purchase-order";
export * from "./purchase-order.zod";
export * from "./workspace-communication";
export * from "./workspace-communication.zod";
export * from "./onboarding";
export * from "./onboarding.zod";
export * from "./portfolio.zod";
export * from "./commoditybid-learning";
export * from "./procurement-strategy";
export * from "./trade-workspace";
export * from "./shipment-portfolio";
export * from "./document-center";
export * from "./exception-hub";
export * from "./payments";
export * from "./commoditybid.winner";
export * from "./freight-estimate";
export * from "./freight-estimate.zod";
export * from "./freight-booking";
export * from "./freight-booking.zod";
export * from "./trade-timeline";
export * from "./import-control-tower";
export * from "./import-control-tower.zod";
