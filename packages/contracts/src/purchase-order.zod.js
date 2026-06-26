import { z } from "zod";
import { AcknowledgementStatus } from "./purchase-order";
export const PoLineInput = z.object({
    sku: z.string().max(64).optional(),
    description: z.string().min(1).max(500),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
});
export const IssuePoRecordPayload = z.object({
    poNumber: z.string().min(1).max(64),
    currency: z.enum(["USD", "EUR", "GBP"]),
    incoterm: z.string().max(32).optional(),
    paymentTerms: z.string().max(200).optional(),
    deliveryTerms: z.string().max(200).optional(),
    lines: z.array(PoLineInput).min(1),
});
export const AcknowledgePoPayload = z.object({
    status: z.enum(AcknowledgementStatus),
    notes: z.string().max(2000).optional(),
});
export const RequestAmendmentPayload = z.object({
    reason: z.string().min(3).max(2000),
    proposedLines: z.array(PoLineInput.extend({
        reason: z.string().max(500).optional(),
    })).optional(),
});
export const ApproveAmendmentPayload = z.object({
    amendmentId: z.string().uuid(),
    reason: z.string().min(3).max(2000),
    lines: z.array(PoLineInput).min(1).optional(),
});
export const RejectAmendmentPayload = z.object({
    amendmentId: z.string().uuid(),
    reason: z.string().min(3).max(2000),
});
export const ClosePoPayload = z.object({
    reason: z.string().max(2000).optional(),
});
export const CancelPoPayload = z.object({
    reason: z.string().min(3).max(2000),
});
//# sourceMappingURL=purchase-order.zod.js.map