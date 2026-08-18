import { z } from "zod";
export declare const RequestDocumentPayload: z.ZodObject<{
    documentType: z.ZodEnum<["COMMERCIAL_INVOICE", "PACKING_LIST", "BILL_OF_LADING", "CERTIFICATE_OF_ORIGIN", "HEALTH_CERTIFICATE", "INSPECTION_REPORT", "INSURANCE_CERTIFICATE", "EXPORT_DECLARATION", "PROOF_OF_DELIVERY", "OTHER"]>;
    ownerRole: z.ZodDefault<z.ZodEnum<["BUYER", "SUPPLIER", "OPERATOR", "SYSTEM"]>>;
}, "strip", z.ZodTypeAny, {
    documentType: "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CERTIFICATE_OF_ORIGIN" | "INSPECTION_REPORT" | "BILL_OF_LADING" | "OTHER" | "INSURANCE_CERTIFICATE" | "EXPORT_DECLARATION" | "HEALTH_CERTIFICATE" | "PROOF_OF_DELIVERY";
    ownerRole: "BUYER" | "SUPPLIER" | "SYSTEM" | "OPERATOR";
}, {
    documentType: "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CERTIFICATE_OF_ORIGIN" | "INSPECTION_REPORT" | "BILL_OF_LADING" | "OTHER" | "INSURANCE_CERTIFICATE" | "EXPORT_DECLARATION" | "HEALTH_CERTIFICATE" | "PROOF_OF_DELIVERY";
    ownerRole?: "BUYER" | "SUPPLIER" | "SYSTEM" | "OPERATOR" | undefined;
}>;
export type RequestDocumentPayload = z.infer<typeof RequestDocumentPayload>;
export declare const UploadDocumentPayload: z.ZodObject<{
    documentType: z.ZodEnum<["COMMERCIAL_INVOICE", "PACKING_LIST", "BILL_OF_LADING", "CERTIFICATE_OF_ORIGIN", "HEALTH_CERTIFICATE", "INSPECTION_REPORT", "INSURANCE_CERTIFICATE", "EXPORT_DECLARATION", "PROOF_OF_DELIVERY", "OTHER"]>;
    ownerRole: z.ZodDefault<z.ZodEnum<["BUYER", "SUPPLIER", "OPERATOR", "SYSTEM"]>>;
    fileId: z.ZodString;
    fileName: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    fileName: string;
    documentType: "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CERTIFICATE_OF_ORIGIN" | "INSPECTION_REPORT" | "BILL_OF_LADING" | "OTHER" | "INSURANCE_CERTIFICATE" | "EXPORT_DECLARATION" | "HEALTH_CERTIFICATE" | "PROOF_OF_DELIVERY";
    ownerRole: "BUYER" | "SUPPLIER" | "SYSTEM" | "OPERATOR";
    fileId: string;
    expiresAt?: string | undefined;
}, {
    fileName: string;
    documentType: "COMMERCIAL_INVOICE" | "PACKING_LIST" | "CERTIFICATE_OF_ORIGIN" | "INSPECTION_REPORT" | "BILL_OF_LADING" | "OTHER" | "INSURANCE_CERTIFICATE" | "EXPORT_DECLARATION" | "HEALTH_CERTIFICATE" | "PROOF_OF_DELIVERY";
    fileId: string;
    ownerRole?: "BUYER" | "SUPPLIER" | "SYSTEM" | "OPERATOR" | undefined;
    expiresAt?: string | undefined;
}>;
export type UploadDocumentPayload = z.infer<typeof UploadDocumentPayload>;
export declare const ReviewDocumentPayload: z.ZodObject<{
    documentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    documentId: string;
}, {
    documentId: string;
}>;
export type ReviewDocumentPayload = z.infer<typeof ReviewDocumentPayload>;
export declare const ApproveDocumentPayload: z.ZodObject<{
    documentId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    reason?: string | undefined;
}, {
    documentId: string;
    reason?: string | undefined;
}>;
export type ApproveDocumentPayload = z.infer<typeof ApproveDocumentPayload>;
export declare const RejectDocumentPayload: z.ZodObject<{
    documentId: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    documentId: string;
}, {
    reason: string;
    documentId: string;
}>;
export type RejectDocumentPayload = z.infer<typeof RejectDocumentPayload>;
export declare const ExpireDocumentPayload: z.ZodObject<{
    documentId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    reason?: string | undefined;
}, {
    documentId: string;
    reason?: string | undefined;
}>;
export type ExpireDocumentPayload = z.infer<typeof ExpireDocumentPayload>;
