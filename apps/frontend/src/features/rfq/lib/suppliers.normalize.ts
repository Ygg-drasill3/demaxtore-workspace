export interface SupplierLookupRow {
  id: string;
  displayName: string;
  email: string;
  organisation?: string | null;
  location?: string | null;
}

/** Primary label in admin supplier pickers — company name when available. */
export function supplierCompanyLabel(
  row: Pick<SupplierLookupRow, "displayName" | "organisation">,
): string {
  const company = row.organisation?.trim();
  return company || row.displayName;
}

/** Admin supplier search must always be an array for list UI. */
export function normalizeSupplierLookup(raw: unknown): SupplierLookupRow[] {
  if (Array.isArray(raw)) return raw as SupplierLookupRow[];
  if (raw && typeof raw === "object") {
    const items = (raw as { items?: unknown; suppliers?: unknown }).items
      ?? (raw as { suppliers?: unknown }).suppliers;
    if (Array.isArray(items)) return items as SupplierLookupRow[];
  }
  return [];
}
