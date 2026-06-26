import { z } from "zod";
import { DocumentOwner, TradeDocumentType } from "./trade-documents";
export const RequestDocumentPayload = z.object({
    documentType: z.enum(TradeDocumentType),
    ownerRole: z.enum(DocumentOwner).default("SUPPLIER"),
});
export const UploadDocumentPayload = z.object({
    documentType: z.enum(TradeDocumentType),
    ownerRole: z.enum(DocumentOwner).default("SUPPLIER"),
    fileId: z.string().min(1),
    fileName: z.string().min(1).max(512),
    expiresAt: z.string().datetime().optional(),
});
export const ReviewDocumentPayload = z.object({
    documentId: z.string().uuid(),
});
export const ApproveDocumentPayload = z.object({
    documentId: z.string().uuid(),
    reason: z.string().max(2000).optional(),
});
export const RejectDocumentPayload = z.object({
    documentId: z.string().uuid(),
    reason: z.string().min(3).max(2000),
});
export const ExpireDocumentPayload = z.object({
    documentId: z.string().uuid(),
    reason: z.string().max(2000).optional(),
});
//# sourceMappingURL=trade-documents.zod.js.map