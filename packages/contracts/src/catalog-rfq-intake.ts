import { z } from "zod";

/** Normalized catalog RFQ form fields (demaxtore.com intake). */
export const CatalogIntakeDTO = z.object({
  productOrService: z.string().optional(),
  deliveryLocation: z.string().optional(),
  quantity: z.string().optional(),
  supplierType: z.string().optional(),
  requestDetails: z.string().optional(),
  businessEmail: z.string().optional(),
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  sessionId: z.string().optional(),
  productImageUrl: z.string().optional(),
});
export type CatalogIntakeDTO = z.infer<typeof CatalogIntakeDTO>;

/** Optional structured fields on catalog ingest POST body. */
export const CatalogRfqFormFields = z.object({
  product_or_service: z.string().max(500).optional(),
  delivery_location: z.string().max(500).optional(),
  quantity: z.union([z.string().max(500), z.coerce.number()]).optional(),
  supplier_type: z.string().max(200).optional(),
  request_details: z.string().max(2000).optional(),
  business_email: z.string().email().optional(),
  company_name: z.string().max(200).optional(),
  contact_person: z.string().max(200).optional(),
  phone: z.string().max(64).optional(),
  product_image: z.string().max(2000).optional(),
});
export type CatalogRfqFormFields = z.infer<typeof CatalogRfqFormFields>;

function clip(s: string, max: number) {
  return s.trim().slice(0, max);
}

function fieldLine(label: string, value: string | undefined | null) {
  const v = (value ?? "").trim();
  return v ? `${label}: ${v}` : "";
}

function section(title: string, lines: string[]) {
  const body = lines.filter(Boolean).join("\n");
  return body ? `${title}:\n${body}` : "";
}

/** Build canonical productDescription text from catalog form fields. */
export function buildCatalogProductDescription(
  intake: CatalogIntakeDTO,
  extraBlocks: string[] = [],
): string {
  const catalogLines = [
    fieldLine("Product or service", intake.productOrService),
    fieldLine("Delivery location", intake.deliveryLocation),
    fieldLine("Quantity", intake.quantity),
    fieldLine("Supplier type", intake.supplierType),
  ].filter(Boolean);

  const requestText = (intake.requestDetails ?? "").trim();
  if (requestText) {
    const bullets = requestText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (l.startsWith("- ") ? l : `- ${l}`));
    catalogLines.push("Request details:", ...bullets);
  }

  const blocks = [
    section("Catalog request", catalogLines),
    section("Your contact details", [
      fieldLine("Business email", intake.businessEmail),
      fieldLine("Company name", intake.companyName),
      fieldLine("Contact person", intake.contactPerson),
      fieldLine("Phone", intake.phone),
    ]),
    ...extraBlocks.filter(Boolean),
    intake.sessionId ? section("System Info", [fieldLine("DeMaxtore session_id", intake.sessionId)]) : "",
  ].filter(Boolean);

  return clip(blocks.join("\n\n"), 5000);
}

/** Map ingest API snake_case body → normalized intake. */
export function catalogIntakeFromIngestBody(body: CatalogRfqFormFields & {
  contact_email?: string;
  contact_name?: string;
  session_id?: string;
  category?: string;
  description?: string;
  product_image?: string;
}): CatalogIntakeDTO {
  const qty =
    body.quantity == null
      ? undefined
      : typeof body.quantity === "number"
        ? String(body.quantity)
        : body.quantity.trim();

  return CatalogIntakeDTO.parse({
    productOrService: body.product_or_service?.trim() || body.category?.trim() || undefined,
    deliveryLocation: body.delivery_location?.trim() || undefined,
    quantity: qty,
    supplierType: body.supplier_type?.trim() || undefined,
    requestDetails: body.request_details?.trim() || undefined,
    businessEmail: body.business_email?.trim() || body.contact_email?.trim() || undefined,
    companyName: body.company_name?.trim() || undefined,
    contactPerson: body.contact_person?.trim() || body.contact_name?.trim() || undefined,
    phone: body.phone?.trim() || undefined,
    sessionId: body.session_id?.trim() || undefined,
    productImageUrl: body.product_image?.trim() || undefined,
  });
}
