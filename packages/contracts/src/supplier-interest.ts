// =============================================================================
// Supplier product interest areas — free-text labels (RFQ matching)
// =============================================================================

export interface OrganisationInterestDto {
  organisationId: string;
  /** Free-text labels typed by supplier / admin. */
  labels: string[];
}

/** @deprecated Kept for older clients that still send categoryIds. */
export interface CatalogCategoryInterestOption {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  sortOrder: number;
}

/** @deprecated Prefer OrganisationInterestDto.labels */
export interface OrganisationCategoryInterestDto extends OrganisationInterestDto {
  categoryIds: string[];
  categories: CatalogCategoryInterestOption[];
}

/** Admin list row — supplier org + current interest summary. */
export interface SupplierOrganisationInterestSummary {
  organisationId: string;
  name: string;
  location: string | null;
  kind: string;
  supplierUserCount: number;
  /** Free-text interest labels. */
  labels: string[];
  /** @deprecated alias of labels */
  categoryNames: string[];
  /** @deprecated always empty for free-text mode */
  categoryIds: string[];
  /** @deprecated always empty for free-text mode */
  categorySlugs: string[];
}

/** Normalize and dedupe free-text interest labels. */
export function normalizeInterestLabels(raw: readonly string[] | null | undefined): string[] {
  if (!raw?.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const trimmed = String(item ?? "")
      .trim()
      .replace(/\s+/g, " ");
    if (!trimmed || trimmed.length > 120) continue;
    const key = trimmed.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= 50) break;
  }
  return out;
}

function normalizeInterestText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when RFQ category text overlaps any free-text interest label.
 */
export function interestLabelsMatchCategory(
  labels: readonly string[] | null | undefined,
  category: string | null | undefined,
): boolean {
  if (!category?.trim() || !labels?.length) return false;
  const hay = normalizeInterestText(category);
  if (!hay) return false;
  return labels.some((label) => {
    const n = normalizeInterestText(label);
    if (!n) return false;
    return hay === n || hay.includes(n) || n.includes(hay);
  });
}

/** @deprecated Fixed taxonomy removed — free-text interests only. */
export const SUPPLIER_INTEREST_CATEGORY_DEFINITIONS: ReadonlyArray<{
  slug: string;
  name: string;
  sortOrder: number;
  keywords: readonly string[];
}> = [];

/** @deprecated */
export const SUPPLIER_INTEREST_LEGACY_SLUG_MAP: Readonly<Record<string, string>> = {};

/** @deprecated */
export const SUPPLIER_INTEREST_CATEGORY_SLUGS: readonly string[] = [];

/** @deprecated */
export const SUPPLIER_INTEREST_CATEGORY_KEYWORDS: ReadonlyArray<{
  slug: string;
  keywords: readonly string[];
}> = [];

/**
 * @deprecated Prefer interestLabelsMatchCategory with free-text labels.
 * Kept as no-op-safe helper for older call sites.
 */
export function resolveInterestCategorySlugs(
  _text: string | null | undefined,
  _knownSlugs: readonly string[] = [],
): string[] {
  return [];
}
