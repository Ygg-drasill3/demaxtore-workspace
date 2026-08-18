export declare const BULK_PRICING_LEARNING: {
    readonly summary: "BulkContainer pricing is operations-led: you submit a specification-based request, and DeMaxtore procurement sources suppliers offline and prepares a buyer-ready offer.";
    readonly topics: readonly ["Submit your 25 MT container request with packing type and technical specifications", "Operations reviews each line — protein, moisture, origin, packing — without exposing suppliers", "Manual supplier pricing uses anonymous codes (SUP-001, SUP-002) visible to operations only", "Buyer receives a consolidated offer in USD/MT with line totals and 72-hour validity", "Approve or request revision — no supplier portal or auction involved"];
};
export declare const BULK_OFFER_EXPIRY_LEARNING: {
    readonly summary: "Bulk offers expire after 72 hours by default. Pricing reflects current supplier quotes and market conditions at offer time.";
    readonly topics: readonly ["Default validity: 72 hours from when operations sends the offer", "Countdown shows remaining time — 72h, 48h, 24h thresholds", "Expired offers become read-only; request a new offer from operations", "Revision requests pause the offer and return the request to procurement", "Approved offers proceed to allocation and payment in a future sprint"];
};
export declare const BULK_SPEC_PRICING_LEARNING: {
    readonly summary: "Technical specifications directly affect bulk pricing. Different protein, ash, moisture, or origin requirements map to different supplier quotes.";
    readonly topics: readonly ["Specification templates are product-type specific — flour, semolina, pulses, salt, pasta", "Packing type (25kg bag vs 50kg bag vs big bag) affects unit economics", "Locked packing catalog ensures consistent pricing keys across offers", "Operations captures a specification snapshot at quote time for auditability", "Changing specs after offer may require a revision request and re-sourcing"];
};
