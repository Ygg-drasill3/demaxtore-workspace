// =============================================================================
// Supplier product interest areas — free-text labels (RFQ matching)
// =============================================================================
/** Normalize and dedupe free-text interest labels. */
export function normalizeInterestLabels(raw) {
    if (!raw?.length)
        return [];
    const out = [];
    const seen = new Set();
    for (const item of raw) {
        const trimmed = String(item ?? "")
            .trim()
            .replace(/\s+/g, " ");
        if (!trimmed || trimmed.length > 120)
            continue;
        const key = trimmed.toLocaleLowerCase("tr-TR");
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(trimmed);
        if (out.length >= 50)
            break;
    }
    return out;
}
function normalizeInterestText(value) {
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
export function interestLabelsMatchCategory(labels, category) {
    if (!category?.trim() || !labels?.length)
        return false;
    const hay = normalizeInterestText(category);
    if (!hay)
        return false;
    return labels.some((label) => {
        const n = normalizeInterestText(label);
        if (!n)
            return false;
        return hay === n || hay.includes(n) || n.includes(hay);
    });
}
/** @deprecated Fixed taxonomy removed — free-text interests only. */
export const SUPPLIER_INTEREST_CATEGORY_DEFINITIONS = [];
/** @deprecated */
export const SUPPLIER_INTEREST_LEGACY_SLUG_MAP = {};
/** @deprecated */
export const SUPPLIER_INTEREST_CATEGORY_SLUGS = [];
/** @deprecated */
export const SUPPLIER_INTEREST_CATEGORY_KEYWORDS = [];
/**
 * @deprecated Prefer interestLabelsMatchCategory with free-text labels.
 * Kept as no-op-safe helper for older call sites.
 */
export function resolveInterestCategorySlugs(_text, _knownSlugs = []) {
    return [];
}
