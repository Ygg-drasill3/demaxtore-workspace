/**
 * RFQ → CommodityBid spawn eligibility.
 * Only standardized commodity products may use the auction path after RFQ intake.
 */
export interface CommodityBidEligibleProduct {
    slug: string;
    /** Buyer-facing label (English canonical). */
    label: string;
    /** Keywords matched against RFQ category + line descriptions (EN/TR). */
    keywords: readonly string[];
}
export declare const COMMODITYBID_ELIGIBLE_PRODUCTS: readonly CommodityBidEligibleProduct[];
export declare const COMMODITYBID_ELIGIBLE_PRODUCT_LABELS: string[];
export declare function commodityBidEligibleProductLabels(locale?: "en" | "tr"): string[];
export interface RfqCommodityBidEligibilityInput {
    productCategory?: string | null;
    lineItems: Array<{
        description: string;
    }>;
}
export interface RfqCommodityBidEligibilityResult {
    eligible: boolean;
    /** Slugs matched across category + lines (for debugging). */
    matchedSlugs: string[];
    /** Line descriptions that are not commodity products. */
    blockingLineItems: string[];
    /** Category text when it does not match any commodity keyword. */
    blockingCategory: string | null;
}
export declare function matchCommodityProduct(text: string | null | undefined): CommodityBidEligibleProduct | null;
export declare function assessRfqCommodityBidEligibility(input: RfqCommodityBidEligibilityInput): RfqCommodityBidEligibilityResult;
export declare function commodityBidEligibilityErrorMessage(result: RfqCommodityBidEligibilityResult, locale?: "en" | "tr"): string;
