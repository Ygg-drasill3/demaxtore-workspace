/**
 * Backend workspace references carry a zero-padded sequence suffix
 * (ORD-DEMO-RFQ-ABC-002-00000000). It means nothing to a customer, so trim it
 * before showing the reference in customer-facing chrome.
 */
export function displayRef(ref: string): string {
  return ref.replace(/-0+$/, "");
}

/** Matches the dash placeholder the portfolio service fills unresolved names with. */
const NAME_PLACEHOLDER = /^[\s—–-]*$/;

/**
 * Resolves a party name for display, falling back when the engine only has its
 * placeholder — a card headline must never render as a bare dash.
 */
export function displayName(value: string | null | undefined, fallback: string): string {
  if (!value || NAME_PLACEHOLDER.test(value)) return fallback;
  return value;
}
