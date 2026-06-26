/** Tie-break when multiple valid bids share the lowest unit price. */
export const TieBreakRule = ["earliest_valid_bid"] as const;
export type TieBreakRule = (typeof TieBreakRule)[number];

export const DEFAULT_TIE_BREAK_RULE: TieBreakRule = "earliest_valid_bid";
