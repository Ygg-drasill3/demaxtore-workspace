/** Tie-break when multiple valid bids share the lowest unit price. */
export declare const TieBreakRule: readonly ["earliest_valid_bid"];
export type TieBreakRule = (typeof TieBreakRule)[number];
export declare const DEFAULT_TIE_BREAK_RULE: TieBreakRule;
