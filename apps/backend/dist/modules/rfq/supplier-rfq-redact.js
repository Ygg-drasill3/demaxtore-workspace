const PII_LINE = /^(Company( name)?:|Phone:|Business email:|Contact person:|DeMaxtore session_id:)/i;
/** Remove contact blocks and labelled PII lines from free-text RFQ descriptions. */
export function stripCustomerTextFromDescription(description) {
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
export function redactRfqTitleForSupplier(title, productCategory) {
    const t = title.trim();
    if (t.includes("—")) {
        const tail = t.split("—").slice(1).join("—").trim();
        if (tail)
            return tail;
    }
    if (productCategory.trim())
        return productCategory.trim();
    return "Procurement request";
}
export function redactRfqDtoForSupplier(dto, supplierUserId) {
    const allowed = dto.allowedQuoteLineItemIds;
    const allLines = dto.lineItems ?? [];
    const scopedLines = allowed?.length
        ? allLines.filter((li) => allowed.includes(li.id))
        : allLines;
    const productCategory = allowed?.length
        ? scopedLines.map((li) => li.description.trim()).filter(Boolean).join(", ")
        : String(dto.productCategory ?? "");
    return {
        ...dto,
        title: redactRfqTitleForSupplier(String(dto.title ?? ""), productCategory),
        productCategory,
        productDescription: stripCustomerTextFromDescription(String(dto.productDescription ?? "")),
        ownerName: "Buyer",
        ownerUserId: undefined,
        catalogIntake: null,
        participants: (dto.participants ?? []).filter((p) => p.userId === supplierUserId),
        lineItems: scopedLines.map((li) => ({
            ...li,
            notes: li.notes ?? null,
            targetPrice: undefined,
        })),
    };
}
export function redactRfqListItemForSupplier(item) {
    return {
        ...item,
        title: redactRfqTitleForSupplier(item.title ?? "", item.productCategory ?? ""),
        ownerName: "Buyer",
    };
}
//# sourceMappingURL=supplier-rfq-redact.js.map