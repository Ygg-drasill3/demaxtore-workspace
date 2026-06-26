export interface SupplierLookupRow {
  id: string;
  displayName: string;
  email: string;
  organisation?: string | null;
  location?: string | null;
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
