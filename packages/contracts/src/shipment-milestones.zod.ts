/** Re-export milestone zod schemas from shipment-workspace for SPR-30-04 consumers. */
export {
  CompleteShipmentMilestoneSchema,
  CreateShipmentMilestoneSchema,
  ListDelayedShipmentsQuerySchema,
  ListUpcomingMilestonesQuerySchema,
  PatchShipmentMilestoneSchema,
  type CompleteShipmentMilestoneInput,
  type CreateShipmentMilestoneInput,
  type ListDelayedShipmentsQuery,
  type ListUpcomingMilestonesQuery,
  type PatchShipmentMilestoneInput,
} from "./shipment-workspace.zod";
