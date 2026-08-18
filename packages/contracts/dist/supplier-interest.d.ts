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
export declare function normalizeInterestLabels(raw: readonly string[] | null | undefined): string[];
/**
 * True when RFQ category text overlaps any free-text interest label.
 */
export declare function interestLabelsMatchCategory(labels: readonly string[] | null | undefined, category: string | null | undefined): boolean;
/** @deprecated Fixed taxonomy removed — free-text interests only. */
export declare const SUPPLIER_INTEREST_CATEGORY_DEFINITIONS: ReadonlyArray<{
    slug: string;
    name: string;
    sortOrder: number;
    keywords: readonly string[];
}>;
/** @deprecated */
export declare const SUPPLIER_INTEREST_LEGACY_SLUG_MAP: Readonly<Record<string, string>>;
/** @deprecated */
export declare const SUPPLIER_INTEREST_CATEGORY_SLUGS: readonly string[];
/** @deprecated */
export declare const SUPPLIER_INTEREST_CATEGORY_KEYWORDS: ReadonlyArray<{
    slug: string;
    keywords: readonly string[];
}>;
/**
 * @deprecated Prefer interestLabelsMatchCategory with free-text labels.
 * Kept as no-op-safe helper for older call sites.
 */
export declare function resolveInterestCategorySlugs(_text: string | null | undefined, _knownSlugs?: readonly string[]): string[];
