import type {
  PurchaseOrderRevisionSnapshot,
  RevisionSnapshotLine,
} from "@dmx/contracts/purchase-order";
import { parsePurchaseOrderRevisionSnapshot } from "@dmx/contracts/purchase-order";

/**
 * Line matching for revision diffs.
 *
 * Snapshots do not preserve PurchaseOrderLine UUIDs. Matching priority:
 *   1. SKU / productCode
 *   2. Description / productName
 *   3. Position (index)
 */
export function revisionLineMatchKey(line: RevisionSnapshotLine, index: number): string {
  const sku = (line.sku ?? line.productCode ?? "").trim();
  if (sku) return `sku:${sku.toLowerCase()}`;
  const desc = (line.description ?? line.productName ?? "").trim();
  if (desc) return `desc:${desc.toLowerCase()}`;
  return `pos:${index}`;
}

export type HeaderFieldKey =
  | "currency"
  | "incoterm"
  | "paymentTerms"
  | "deliveryTerms"
  | "notes"
  | "buyerReference"
  | "expectedDeliveryDate"
  | "destinationPort"
  | "destinationCountryCode";

export const HEADER_DIFF_FIELDS: Array<{ key: HeaderFieldKey; label: string }> = [
  { key: "currency", label: "Currency" },
  { key: "incoterm", label: "Incoterm" },
  { key: "paymentTerms", label: "Payment terms" },
  { key: "deliveryTerms", label: "Delivery terms" },
  { key: "notes", label: "Notes" },
  { key: "buyerReference", label: "Buyer reference" },
  { key: "expectedDeliveryDate", label: "Expected delivery" },
  { key: "destinationPort", label: "Destination port" },
  { key: "destinationCountryCode", label: "Destination country" },
];

export type FieldDiff = {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
  kind: "changed" | "added" | "removed";
};

export type LineDiffKind = "added" | "removed" | "unchanged" | "changed";

export type LineFieldChange = {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
};

export type LineDiff = {
  key: string;
  kind: LineDiffKind;
  before?: RevisionSnapshotLine;
  after?: RevisionSnapshotLine;
  changes: LineFieldChange[];
};

export type RevisionDiffResult = {
  header: FieldDiff[];
  lines: LineDiff[];
};

function display(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v);
}

function eq(a: string | null, b: string | null): boolean {
  return a === b;
}

/** Prefer structured Direct lines when present; else legacy snapshot lines. */
export function resolveSnapshotLines(snapshot: PurchaseOrderRevisionSnapshot): RevisionSnapshotLine[] {
  const legacy = snapshot.lines ?? [];
  const direct = snapshot.header.directLines ?? snapshot.directLines;
  if (direct?.length) {
    // Merge so SKU / totals from legacy `lines` remain available for matching + display.
    return direct.map((d, i) => {
      const base = legacy[i] ?? {};
      return {
        ...base,
        ...d,
        sku: d.sku ?? d.productCode ?? base.sku ?? null,
        productCode: d.productCode ?? base.productCode ?? null,
        description: d.description ?? d.productName ?? base.description ?? null,
        quantity: d.quantity ?? base.quantity ?? null,
        unitPrice: d.unitPrice ?? base.unitPrice ?? null,
        lineTotal: d.lineTotal ?? base.lineTotal ?? null,
      };
    });
  }
  return legacy;
}

function headerValue(
  snap: PurchaseOrderRevisionSnapshot,
  key: HeaderFieldKey,
): string | null {
  const h = snap.header;
  if (key === "destinationCountryCode") {
    return display(h.destinationCountryCode ?? h.destinationCountry);
  }
  return display(h[key]);
}

const LINE_FIELDS: Array<{ field: keyof RevisionSnapshotLine; label: string }> = [
  { field: "sku", label: "SKU" },
  { field: "productCode", label: "Product code" },
  { field: "productName", label: "Product name" },
  { field: "description", label: "Description" },
  { field: "specification", label: "Specification" },
  { field: "packaging", label: "Packaging" },
  { field: "unit", label: "Unit" },
  { field: "quantity", label: "Quantity" },
  { field: "unitPrice", label: "Unit price" },
  { field: "lineTotal", label: "Line total" },
];

function compareLines(before: RevisionSnapshotLine, after: RevisionSnapshotLine): LineFieldChange[] {
  const changes: LineFieldChange[] = [];
  for (const { field, label } of LINE_FIELDS) {
    const b = display(before[field]);
    const a = display(after[field]);
    if (!eq(b, a)) {
      changes.push({ field, label, before: b, after: a });
    }
  }
  return changes;
}

export function diffRevisionSnapshots(
  beforeRaw: unknown,
  afterRaw: unknown,
): RevisionDiffResult {
  const before = parsePurchaseOrderRevisionSnapshot(beforeRaw);
  const after = parsePurchaseOrderRevisionSnapshot(afterRaw);

  const header: FieldDiff[] = [];
  for (const { key, label } of HEADER_DIFF_FIELDS) {
    const b = headerValue(before, key);
    const a = headerValue(after, key);
    if (eq(b, a)) continue;
    if (b == null && a != null) header.push({ field: key, label, before: b, after: a, kind: "added" });
    else if (b != null && a == null) header.push({ field: key, label, before: b, after: a, kind: "removed" });
    else header.push({ field: key, label, before: b, after: a, kind: "changed" });
  }

  const beforeLines = resolveSnapshotLines(before);
  const afterLines = resolveSnapshotLines(after);

  const beforeMap = new Map<string, { line: RevisionSnapshotLine; index: number }>();
  beforeLines.forEach((line, index) => {
    beforeMap.set(revisionLineMatchKey(line, index), { line, index });
  });
  const afterMap = new Map<string, { line: RevisionSnapshotLine; index: number }>();
  afterLines.forEach((line, index) => {
    afterMap.set(revisionLineMatchKey(line, index), { line, index });
  });

  const keys = [...new Set([...beforeMap.keys(), ...afterMap.keys()])];
  const lines: LineDiff[] = keys.map((key) => {
    const b = beforeMap.get(key);
    const a = afterMap.get(key);
    if (b && !a) {
      return { key, kind: "removed" as const, before: b.line, changes: [] };
    }
    if (!b && a) {
      return { key, kind: "added" as const, after: a.line, changes: [] };
    }
    const changes = compareLines(b!.line, a!.line);
    return {
      key,
      kind: (changes.length ? "changed" : "unchanged") as LineDiffKind,
      before: b!.line,
      after: a!.line,
      changes,
    };
  });

  return {
    header,
    lines: lines.filter((l) => l.kind !== "unchanged"),
  };
}

export function isCurrentRevision(
  revisionNumber: number,
  revisions: ReadonlyArray<{ revisionNumber: number }>,
): boolean {
  if (!revisions.length) return false;
  return revisionNumber === Math.max(...revisions.map((r) => r.revisionNumber));
}
