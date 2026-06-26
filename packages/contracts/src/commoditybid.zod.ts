// =============================================================================
// DeMaxtore — CommodityBid zod schemas
// =============================================================================
import { z } from "zod";
import { DateTimeInput } from "./datetime-input";

export const Currency = z.enum(["USD", "EUR", "GBP"]);

export const LotInput = z.object({
  commodity: z.string().min(1).max(300),
  quantity:  z.number().positive(),
  uom:       z.string().min(1).max(16),
  specs:     z.record(z.unknown()).optional(),
  incoterms: z.string().max(32).optional(),
  deliveryWindow: z.string().max(200).optional(),
  notes:     z.string().max(1000).optional(),
});

export const AuctionDurationMinutes = z.coerce.number().int().min(1).max(120);

export const CreateCommodityBidDraftInput = z.object({
  title:       z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  productCategory: z.string().max(120).optional(),
  targetMarket:    z.string().max(120).optional(),
  currency:    Currency,
  auctionStartsAt: DateTimeInput,
  auctionDurationMinutes: AuctionDurationMinutes.default(30),
  invitationDeadlineMinutes: z.number().int().positive().max(10080).default(60),
  supplierUserIds: z.array(z.string().uuid()).min(1).max(50),
  lots:        z.array(LotInput).min(1),
});

export const ScheduleAuctionPayload = z.object({
  auctionStartsAt: DateTimeInput,
  auctionDurationMinutes: AuctionDurationMinutes.default(30),
  invitationDeadlineMinutes: z.number().int().positive().max(10080).default(60),
  supplierUserIds: z.array(z.string().uuid()).min(1).max(50),
});
export type CreateCommodityBidDraftInput = z.infer<typeof CreateCommodityBidDraftInput>;

export const EditCommodityBidDraftInput = CreateCommodityBidDraftInput.partial();

export const InviteSuppliersPayload = z.object({
  supplierUserIds: z.array(z.string().uuid()).min(1).max(50),
});
export const AddSupplierPayload = InviteSuppliersPayload;
export const RemoveSupplierPayload = z.object({ supplierUserId: z.string().uuid() });
export const RejectBidPayload = z.object({ reason: z.string().min(3).max(2000) });
export const PublishBidPayload = z.object({}).strict();
export const ExtendDeadlinePayload = z.object({ newDeadline: z.string().datetime() });
export const ReopenBidsPayload = z.object({
  reason: z.string().min(3).max(2000),
  newDeadline: z.string().datetime(),
});
export const CloseBidsEarlyPayload = z.object({ reason: z.string().max(2000).optional() });
export const DraftAwardLotPayload = z.object({
  lotId: z.string().uuid(),
  submissionId: z.string().uuid(),
});
export const MarkLotNoAwardPayload = z.object({
  lotId: z.string().uuid(),
  reason: z.string().min(3).max(2000),
});
export const PublishAwardsPayload = z.object({}).strict();
export const CloseWithoutAwardPayload = z.object({ reason: z.string().min(3).max(2000) });
export const AcceptAwardLotPayload = z.object({ lotId: z.string().uuid() });
export const DeclineAwardLotPayload = z.object({
  lotId: z.string().uuid(),
  reason: z.string().min(3).max(2000),
});
export const WithdrawAwardLotPayload = z.object({
  lotId: z.string().uuid(),
  reason: z.string().min(3).max(2000),
});
export const ReAwardLotPayload = z.object({
  lotId: z.string().uuid(),
  submissionId: z.string().uuid(),
});
export const IssueContractsPayload = z.object({
  contractRefs: z.record(z.string()).optional(),
});
export const CancelBidPayload = z.object({ reason: z.string().min(3).max(2000) });

export const SubmitBidLotPayload = z.object({
  unitPrice:     z.number().positive(),
  leadTimeDays:  z.number().int().positive().max(365).optional(),
  moq:           z.number().int().positive().optional(),
  paymentTerms:  z.string().max(200).optional(),
  deliveryTerms: z.string().max(200).optional(),
  validUntil:    z.string().datetime(),
  notes:         z.string().max(2000).optional(),
});
export const ReviseBidLotPayload = SubmitBidLotPayload;
export const WithdrawBidLotPayload = z.object({ reason: z.string().min(3).max(2000).optional() });

export const ActionEnvelope = z.object({
  payload: z.record(z.unknown()).optional(),
  reason:  z.string().optional(),
  idempotencyKey: z.string().max(128).optional(),
});

export const ListCommodityBidQuery = z.object({
  state: z.string().optional(),
  from:  z.string().datetime().optional(),
  to:    z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
