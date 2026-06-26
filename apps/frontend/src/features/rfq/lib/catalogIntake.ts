import type { CatalogIntakeDTO } from "@dmx/contracts/catalog-rfq-intake";
import type { RfqDTO } from "@dmx/contracts/rfq.zod";
import { CatalogIntakeDTO as CatalogIntakeSchema } from "@dmx/contracts/catalog-rfq-intake";
import { parseRfqDescription } from "./rfqDescription.parse";

type RfqLike = Pick<RfqDTO, "productCategory" | "productDescription" | "targetMarket" | "title"> & {
  catalogIntake?: CatalogIntakeDTO | null;
  ownerName?: string;
};

function pickField(sections: ReturnType<typeof parseRfqDescription>["sections"], key: string, label: string) {
  const section = sections.find((s) => s.key === key);
  if (!section) return undefined;
  const f = section.fields.find((x) => x.label.toLowerCase() === label.toLowerCase());
  return f?.value;
}

function bulletsAsText(sections: ReturnType<typeof parseRfqDescription>["sections"], key: string) {
  const section = sections.find((s) => s.key === key);
  if (!section?.bullets.length) return undefined;
  return section.bullets.join("\n");
}

function firstMatch(text: string, re: RegExp) {
  const m = text.match(re);
  return m?.[1]?.trim();
}

/** Resolve catalog form fields from DTO metadata or legacy description text. */
export function resolveCatalogIntake(rfq: RfqLike): CatalogIntakeDTO | null {
  if (rfq.catalogIntake && Object.values(rfq.catalogIntake).some(Boolean)) {
    return CatalogIntakeSchema.parse(rfq.catalogIntake);
  }

  const desc = rfq.productDescription ?? "";
  const { sections } = parseRfqDescription(desc, { includeAll: true });

  const fromCatalog = pickField(sections, "catalog request", "Product or service");
  const fromContact = {
    businessEmail: pickField(sections, "your contact details", "Business email"),
    companyName: pickField(sections, "your contact details", "Company name"),
    contactPerson: pickField(sections, "your contact details", "Contact person"),
    phone: pickField(sections, "your contact details", "Phone"),
  };

  const intake: CatalogIntakeDTO = {
    productOrService:
      fromCatalog
      ?? pickField(sections, "logistics / notes", "Product / service")
      ?? rfq.productCategory
      ?? undefined,
    deliveryLocation:
      pickField(sections, "catalog request", "Delivery location")
      ?? pickField(sections, "shipping info", "Delivery location")
      ?? pickField(sections, "shipping info", "Destination")
      ?? pickField(sections, "shipping info", "Delivery")
      ?? rfq.targetMarket
      ?? undefined,
    quantity:
      pickField(sections, "catalog request", "Quantity")
      ?? pickField(sections, "quantity", "Quantity")
      ?? bulletsAsText(sections, "quantity")
      ?? undefined,
    supplierType: pickField(sections, "catalog request", "Supplier type") ?? undefined,
    requestDetails:
      pickField(sections, "catalog request", "Request details")
      ?? bulletsAsText(sections, "request details")
      ?? undefined,
    businessEmail: fromContact.businessEmail ?? undefined,
    companyName:
      fromContact.companyName
      ?? pickField(sections, "company info", "Company")
      ?? firstMatch(desc, /Company:\s*(.+)/i)
      ?? (rfq.title?.includes("—") ? rfq.title.split("—")[0]?.trim() : undefined),
    contactPerson: fromContact.contactPerson ?? undefined,
    phone:
      fromContact.phone
      ?? pickField(sections, "company info", "Phone")
      ?? firstMatch(desc, /Phone:\s*(.+)/i)
      ?? undefined,
    sessionId:
      pickField(sections, "system info", "DeMaxtore session_id")
      ?? firstMatch(desc, /DeMaxtore session_id:\s*(\S+)/i)
      ?? undefined,
  };

  const hasAny = Object.values(intake).some((v) => v != null && String(v).trim() !== "");
  return hasAny ? CatalogIntakeSchema.parse(intake) : null;
}

export const CATALOG_FORM_FIELDS: Array<{
  key: keyof CatalogIntakeDTO;
  labelKey: string;
  required?: boolean;
}> = [
  { key: "productOrService", labelKey: "rfq.catalog.productOrService", required: true },
  { key: "deliveryLocation", labelKey: "rfq.catalog.deliveryLocation", required: true },
  { key: "quantity", labelKey: "rfq.catalog.quantity", required: true },
  { key: "supplierType", labelKey: "rfq.catalog.supplierType" },
  { key: "requestDetails", labelKey: "rfq.catalog.requestDetails", required: true },
  { key: "businessEmail", labelKey: "rfq.catalog.businessEmail", required: true },
  { key: "companyName", labelKey: "rfq.catalog.companyName", required: true },
  { key: "contactPerson", labelKey: "rfq.catalog.contactPerson" },
  { key: "phone", labelKey: "rfq.catalog.phone" },
  { key: "sessionId", labelKey: "rfq.catalog.sessionId" },
];
