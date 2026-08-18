/** Canonical RFQ / quotation unit labels (Piece · Carton · Ton). */
export const QUOTE_UOM_LABELS = {
  piece: "Piece",
  carton: "Carton",
  ton: "Ton",
} as const;

export type QuoteUomKey = keyof typeof QUOTE_UOM_LABELS;

/** Map free-form / legacy UOM strings to a display label. Never shows "Container". */
export function formatQuoteUom(raw?: string | null): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return QUOTE_UOM_LABELS.piece;

  if (v === "piece" || v === "pieces" || v === "pcs" || v === "pc" || v === "ea" || v === "each") {
    return QUOTE_UOM_LABELS.piece;
  }
  if (v === "carton" || v === "cartons" || v === "ctn" || v === "box" || v === "boxes") {
    return QUOTE_UOM_LABELS.carton;
  }
  if (v === "ton" || v === "tons" || v === "tonne" || v === "tonnes" || v === "mt" || v === "t") {
    return QUOTE_UOM_LABELS.ton;
  }
  // Legacy container → treat as Piece for display (unit is no longer Container).
  if (v === "container" || v === "containers" || v === "ctr" || v === "teu") {
    return QUOTE_UOM_LABELS.piece;
  }

  // Title-case unknown units rather than inventing Container.
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/** Plural-aware quantity + unit, e.g. "20 Tons" / "1 Piece". */
export function formatQuoteQtyWithUom(qty: number | null | undefined, rawUom?: string | null): string {
  const label = formatQuoteUom(rawUom);
  if (qty == null || !Number.isFinite(qty)) return label;
  const n = Math.abs(qty) === 1 ? label : `${label}s`;
  // Ton already ends with 's' sound when pluralized as "Tons"; Piece→Pieces, Carton→Cartons.
  const plural =
    label === "Ton" ? (Math.abs(qty) === 1 ? "Ton" : "Tons") :
    label === "Piece" ? (Math.abs(qty) === 1 ? "Piece" : "Pieces") :
    label === "Carton" ? (Math.abs(qty) === 1 ? "Carton" : "Cartons") :
    n;
  return `${qty} ${plural}`;
}
