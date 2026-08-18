/**
 * RFQ → CommodityBid spawn eligibility.
 * Only standardized commodity products may use the auction path after RFQ intake.
 */
export const COMMODITYBID_ELIGIBLE_PRODUCTS = [
    {
        slug: "pasta",
        label: "Pasta / Spaghetti",
        keywords: ["pasta", "spaghetti", "makarna", "macaroni", "penne", "fusilli", "noodle", "noodles"],
    },
    {
        slug: "sunflower-oil",
        label: "Sunflower oil",
        keywords: [
            "sunflower oil",
            "sunflower-oil",
            "refined sunflower",
            "ayçiçek yağı",
            "aycicek yagi",
            "ayçiçek yagi",
            "aycicek yağı",
        ],
    },
    {
        slug: "semolina",
        label: "Semolina",
        keywords: ["semolina", "irmik", "durum semolina"],
    },
    {
        slug: "bulgur",
        label: "Bulgur",
        keywords: ["bulgur", "bulghur", "coarse bulgur", "yellow bulgur"],
    },
];
export const COMMODITYBID_ELIGIBLE_PRODUCT_LABELS = COMMODITYBID_ELIGIBLE_PRODUCTS.map((p) => p.label);
const COMMODITYBID_ELIGIBLE_LABELS_TR = {
    pasta: "Makarna / Spaghetti",
    "sunflower-oil": "Ayçiçek yağı",
    semolina: "İrmik",
    bulgur: "Bulgur",
};
export function commodityBidEligibleProductLabels(locale = "en") {
    if (locale === "tr") {
        return COMMODITYBID_ELIGIBLE_PRODUCTS.map((p) => COMMODITYBID_ELIGIBLE_LABELS_TR[p.slug] ?? p.label);
    }
    return [...COMMODITYBID_ELIGIBLE_PRODUCT_LABELS];
}
function normalizeCommodityText(value) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/ı/g, "i")
        .replace(/ğ/g, "g")
        .replace(/ş/g, "s")
        .replace(/ç/g, "c")
        .replace(/ö/g, "o")
        .replace(/ü/g, "u")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}
function matchesCommodityKeyword(normalizedHaystack, keyword) {
    const needle = normalizeCommodityText(keyword);
    if (!needle)
        return false;
    if (normalizedHaystack === needle)
        return true;
    if (normalizedHaystack.includes(needle))
        return true;
    const words = needle.split(/\s+/).filter(Boolean);
    if (words.length > 1)
        return normalizedHaystack.includes(needle);
    return normalizedHaystack.split(/\s+/).some((w) => w === needle || w.startsWith(needle) || needle.startsWith(w));
}
export function matchCommodityProduct(text) {
    const normalized = normalizeCommodityText(text ?? "");
    if (!normalized)
        return null;
    for (const product of COMMODITYBID_ELIGIBLE_PRODUCTS) {
        if (product.keywords.some((kw) => matchesCommodityKeyword(normalized, kw))) {
            return product;
        }
    }
    return null;
}
export function assessRfqCommodityBidEligibility(input) {
    const matchedSlugs = new Set();
    const blockingLineItems = [];
    const category = (input.productCategory ?? "").trim();
    const categoryMatch = category ? matchCommodityProduct(category) : null;
    if (categoryMatch)
        matchedSlugs.add(categoryMatch.slug);
    for (const line of input.lineItems) {
        const desc = line.description.trim();
        if (!desc) {
            blockingLineItems.push(desc);
            continue;
        }
        const lineMatch = matchCommodityProduct(desc);
        if (lineMatch) {
            matchedSlugs.add(lineMatch.slug);
        }
        else {
            blockingLineItems.push(desc);
        }
    }
    const blockingCategory = category && !categoryMatch ? category : null;
    const eligible = input.lineItems.length > 0 &&
        blockingLineItems.length === 0 &&
        blockingCategory === null;
    return {
        eligible,
        matchedSlugs: [...matchedSlugs],
        blockingLineItems,
        blockingCategory,
    };
}
export function commodityBidEligibilityErrorMessage(result, locale = "en") {
    const allowed = commodityBidEligibleProductLabels(locale).join(", ");
    if (locale === "tr") {
        const extras = [
            ...result.blockingLineItems.filter(Boolean),
            ...(result.blockingCategory ? [result.blockingCategory] : []),
        ];
        const extra = extras.length ? ` (${extras.join(", ")})` : "";
        return `Commodity olmayan bir ürün seçtiniz${extra}. Yalnızca şu ürünlerden CommodityBid oluşturulabilir: ${allowed}.`;
    }
    const extras = [
        ...result.blockingLineItems.filter(Boolean),
        ...(result.blockingCategory ? [result.blockingCategory] : []),
    ];
    const extra = extras.length ? ` (${extras.join(", ")})` : "";
    return `This RFQ includes non-commodity product(s)${extra}. CommodityBid can only be created for: ${allowed}.`;
}
