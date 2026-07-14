/**
 * Strip buyer / customer PII from RFQ payloads returned to suppliers.
 */
type LineItemRow = {
  id: string;
  position: number;
  description: string;
  quantity: number;
  uom: string;
  notes?: string | null;
  targetPrice?: number | null;
};

export type RfqDtoLike = Record<string, unknown> & {
  title?: string;
  productCategory?: string;
  productDescription?: string;
  ownerName?: string;
  ownerUserId?: string;
  catalogIntake?: unknown;
  lineItems?: LineItemRow[];
  participants?: Array<{ userId: string; participantRole: string }>;
};

const PII_LINE =
  /^(Company( name)?:|Phone:|Business email:|Contact person:|DeMaxtore session_id:)/i;

/** Remove contact blocks and labelled PII lines from free-text RFQ descriptions. */
export function stripCustomerTextFromDescription(description: string): string {
  let text = description ?? "";
  text = text.replace(/Your contact details:\n[\s\S]*?(?=\n\n[A-Za-z][^\n]*:|$)/gi, "");
  text = text.replace(/System Info:\n[\s\S]*?(?=\n\n|$)/gi, "");
  return text
    .split("\n")
    .filter((line) => !PII_LINE.test(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Hide buyer company prefix in titles like "ECODIS — DeMaxtore catalog". */
export function redactRfqTitleForSupplier(title: string, productCategory: string): string {
  const t = title.trim();
  if (t.includes("—")) {
    const tail = t.split("—").slice(1).join("—").trim();
    if (tail) return tail;
  }
  if (productCategory.trim()) return productCategory.trim();
  return "Procurement request";
}

export function redactRfqDtoForSupplier<T extends RfqDtoLike>(
  dto: T,
  supplierUserId: string,
): T {
  const productCategory = String(dto.productCategory ?? "");
  return {
    ...dto,
    title: redactRfqTitleForSupplier(String(dto.title ?? ""), productCategory),
    productDescription: stripCustomerTextFromDescription(String(dto.productDescription ?? "")),
    ownerName: "Buyer",
    ownerUserId: undefined,
    catalogIntake: null,
    participants: (dto.participants ?? []).filter((p) => p.userId === supplierUserId),
    lineItems: (dto.lineItems ?? []).map((li) => ({
      ...li,
      notes: li.notes ?? null,
      targetPrice: undefined,
    })),
  };
}

export function redactRfqListItemForSupplier(item: {
  title?: string;
  ownerName?: string;
  productCategory?: string;
}): typeof item {
  return {
    ...item,
    title: redactRfqTitleForSupplier(item.title ?? "", item.productCategory ?? ""),
    ownerName: "Buyer",
  };
}
