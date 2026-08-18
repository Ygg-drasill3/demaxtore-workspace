import { z } from "zod";
import { COMMERCIAL_DOCUMENT_CATEGORIES, COMMERCIAL_DOCUMENT_SOURCES, } from "./commercial-document.js";
export const CommercialDocumentCategorySchema = z.enum(COMMERCIAL_DOCUMENT_CATEGORIES);
export const CommercialDocumentSourceSchema = z.enum(COMMERCIAL_DOCUMENT_SOURCES);
export const CommercialDocumentListQuerySchema = z
    .object({
    category: z.preprocess((v) => (v === "" || v == null ? undefined : v), CommercialDocumentCategorySchema.optional()),
    source: z.preprocess((v) => (v === "" || v == null ? undefined : v), CommercialDocumentSourceSchema.optional()),
    search: z
        .string()
        .trim()
        .max(200)
        .optional()
        .or(z.literal(""))
        .transform((v) => (v ? v : undefined)),
    uploadedFrom: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    uploadedTo: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    sort: z.enum(["uploadedAt", "fileName", "category"]).default("uploadedAt"),
    direction: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
})
    .superRefine((data, ctx) => {
    if (data.uploadedFrom && data.uploadedTo && data.uploadedFrom > data.uploadedTo) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Start date cannot be later than end date",
            path: ["uploadedFrom"],
        });
    }
});
export const CommercialDocumentUploadMetaSchema = z.object({
    category: CommercialDocumentCategorySchema,
    title: z.string().trim().max(250).optional().nullable(),
    description: z.string().trim().max(5000).optional().nullable(),
    referenceNumber: z.string().trim().max(250).optional().nullable(),
    documentDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .nullable(),
});
export const CommercialDocumentReplaceMetaSchema = CommercialDocumentUploadMetaSchema.partial().extend({
    category: CommercialDocumentCategorySchema.optional(),
});
export const CommercialDocumentActorSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
});
export const CommercialDocumentDtoSchema = z.object({
    id: z.string().min(1),
    purchaseOrderId: z.string().uuid(),
    orderId: z.string().uuid().nullable().optional(),
    category: CommercialDocumentCategorySchema,
    source: CommercialDocumentSourceSchema,
    fileName: z.string().min(1),
    originalFileName: z.string().nullable().optional(),
    mimeType: z.string().min(1),
    fileSize: z.number().int().nonnegative().nullable().optional(),
    documentUrl: z.string().nullable().optional(),
    previewUrl: z.string().nullable().optional(),
    downloadUrl: z.string().nullable().optional(),
    uploadedAt: z.string(),
    uploadedBy: CommercialDocumentActorSchema.nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    referenceNumber: z.string().nullable().optional(),
    documentDate: z.string().nullable().optional(),
    canPreview: z.boolean(),
    canDownload: z.boolean(),
    canReplace: z.boolean(),
    canDelete: z.boolean(),
});
