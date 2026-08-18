/**
 * Human-friendly labels for workspace external refs.
 * Stored IDs stay unchanged (e.g. ORD-RFQ-2026-0239-38bf7df9).
 */

export type WorkspaceRefParts = {
  /** Short primary label, e.g. "Order 0239" */
  label: string;
  /** Optional secondary context, e.g. "from RFQ · 2026" */
  detail: string | null;
  /** Unchanged system reference */
  full: string;
  kind: "order" | "rfq" | "shipment" | "other";
};

const TRAILING_HASH = /-[0-9a-f]{6,}$/i;

function stripTrailingHash(ref: string): string {
  return ref.replace(TRAILING_HASH, "");
}

/**
 * ORD-RFQ-2026-0239-38bf7df9 → { label: "Order 0239", detail: "from RFQ · 2026", kind: "order" }
 * RFQ-2026-0183-xxxx → { label: "RFQ 0183", detail: "2026", kind: "rfq" }
 */
export function formatWorkspaceRef(raw: string | null | undefined): WorkspaceRefParts {
  const full = (raw ?? "").trim();
  if (!full) {
    return { label: "—", detail: null, full: "", kind: "other" };
  }

  const base = stripTrailingHash(full);
  const upper = base.toUpperCase();

  // ORD-RFQ-2026-0239 | ORD-CB-2026-0012 | ORD-DIR-2026-0007
  let m = upper.match(/^ORD-(RFQ|CB|DIR|PO)-(\d{4})-(\d{3,})$/);
  if (m) {
    const origin =
      m[1] === "RFQ" ? "RFQ" : m[1] === "CB" ? "CommodityBid" : m[1] === "PO" ? "PO" : "Direct";
    return {
      label: `Order ${m[3]}`,
      detail: `from ${origin} · ${m[2]}`,
      full,
      kind: "order",
    };
  }

  // ORD-DIR-PO-MSOJSFGG-E12AD05A (direct PO; trailing hash already stripped once)
  m = upper.match(/^ORD-DIR-PO-([A-Z0-9]+)(?:-[A-F0-9]{6,})?$/);
  if (m) {
    return {
      label: `Order ${m[1]}`,
      detail: "from Direct PO",
      full,
      kind: "order",
    };
  }
  // ORD-DIR-{rest}-{suffix}
  m = upper.match(/^ORD-DIR-(.+)-([A-Z0-9]{6,})$/);
  if (m) {
    return {
      label: `Order ${m[2]}`,
      detail: "from Direct PO",
      full,
      kind: "order",
    };
  }

  // ORD-2026-0239 (no origin segment)
  m = upper.match(/^ORD-(\d{4})-(\d{3,})$/);
  if (m) {
    return { label: `Order ${m[2]}`, detail: m[1], full, kind: "order" };
  }

  // ORD-ORCH-{timestamp}-{slug} (orchestration / test workspaces)
  m = upper.match(/^ORD-ORCH-(\d+)-([A-Z0-9]+)$/);
  if (m) {
    return {
      label: `Order ${m[2]}`,
      detail: "orchestration",
      full,
      kind: "order",
    };
  }

  // RFQ-2026-0183
  m = upper.match(/^RFQ-(\d{4})-(\d{3,})$/);
  if (m) {
    return { label: `RFQ ${m[2]}`, detail: m[1], full, kind: "rfq" };
  }

  // SHP-… or SHIP-…
  m = upper.match(/^(?:SHP|SHIP)(?:-ORD)?-?(?:RFQ|CB|DIR)?-?(\d{4})?-?(\d{3,})?/);
  if (m && (m[1] || m[2])) {
    const seq = m[2] ?? m[1] ?? "";
    return {
      label: seq ? `Shipment ${seq}` : "Shipment",
      detail: m[1] && m[2] ? m[1] : null,
      full,
      kind: "shipment",
    };
  }

  // Fallback: last numeric token, else truncated full
  const nums = upper.match(/(\d{3,})/g);
  const last = nums?.[nums.length - 1];
  if (last && /^(ORD|RFQ|SHP|SHIP|PO)/.test(upper)) {
    const kind = upper.startsWith("ORD")
      ? "order"
      : upper.startsWith("RFQ")
        ? "rfq"
        : upper.startsWith("SHP") || upper.startsWith("SHIP")
          ? "shipment"
          : "other";
    const prefix =
      kind === "order" ? "Order" : kind === "rfq" ? "RFQ" : kind === "shipment" ? "Shipment" : "Ref";
    return { label: `${prefix} ${last}`, detail: null, full, kind };
  }

  return { label: full.length > 28 ? `${full.slice(0, 24)}…` : full, detail: null, full, kind: "other" };
}

/** Compact single-line label for tables/lists. */
export function workspaceRefLabel(raw: string | null | undefined): string {
  return formatWorkspaceRef(raw).label;
}
