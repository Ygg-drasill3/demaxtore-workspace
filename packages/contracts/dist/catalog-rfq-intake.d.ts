import { z } from "zod";
/** Normalized catalog RFQ form fields (demaxtore.com intake). */
export declare const CatalogIntakeDTO: z.ZodObject<{
    productOrService: z.ZodOptional<z.ZodString>;
    deliveryLocation: z.ZodOptional<z.ZodString>;
    quantity: z.ZodOptional<z.ZodString>;
    supplierType: z.ZodOptional<z.ZodString>;
    requestDetails: z.ZodOptional<z.ZodString>;
    businessEmail: z.ZodOptional<z.ZodString>;
    companyName: z.ZodOptional<z.ZodString>;
    contactPerson: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phone?: string | undefined;
    productOrService?: string | undefined;
    deliveryLocation?: string | undefined;
    quantity?: string | undefined;
    supplierType?: string | undefined;
    requestDetails?: string | undefined;
    businessEmail?: string | undefined;
    companyName?: string | undefined;
    contactPerson?: string | undefined;
    sessionId?: string | undefined;
}, {
    phone?: string | undefined;
    productOrService?: string | undefined;
    deliveryLocation?: string | undefined;
    quantity?: string | undefined;
    supplierType?: string | undefined;
    requestDetails?: string | undefined;
    businessEmail?: string | undefined;
    companyName?: string | undefined;
    contactPerson?: string | undefined;
    sessionId?: string | undefined;
}>;
export type CatalogIntakeDTO = z.infer<typeof CatalogIntakeDTO>;
/** Optional structured fields on catalog ingest POST body. */
export declare const CatalogRfqFormFields: z.ZodObject<{
    product_or_service: z.ZodOptional<z.ZodString>;
    delivery_location: z.ZodOptional<z.ZodString>;
    quantity: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    supplier_type: z.ZodOptional<z.ZodString>;
    request_details: z.ZodOptional<z.ZodString>;
    business_email: z.ZodOptional<z.ZodString>;
    company_name: z.ZodOptional<z.ZodString>;
    contact_person: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phone?: string | undefined;
    quantity?: string | number | undefined;
    product_or_service?: string | undefined;
    delivery_location?: string | undefined;
    supplier_type?: string | undefined;
    request_details?: string | undefined;
    business_email?: string | undefined;
    company_name?: string | undefined;
    contact_person?: string | undefined;
}, {
    phone?: string | undefined;
    quantity?: string | number | undefined;
    product_or_service?: string | undefined;
    delivery_location?: string | undefined;
    supplier_type?: string | undefined;
    request_details?: string | undefined;
    business_email?: string | undefined;
    company_name?: string | undefined;
    contact_person?: string | undefined;
}>;
export type CatalogRfqFormFields = z.infer<typeof CatalogRfqFormFields>;
/** Build canonical productDescription text from catalog form fields. */
export declare function buildCatalogProductDescription(intake: CatalogIntakeDTO, extraBlocks?: string[]): string;
/** Map ingest API snake_case body → normalized intake. */
export declare function catalogIntakeFromIngestBody(body: CatalogRfqFormFields & {
    contact_email?: string;
    contact_name?: string;
    session_id?: string;
    category?: string;
    description?: string;
}): CatalogIntakeDTO;
