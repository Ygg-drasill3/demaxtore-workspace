import type { ReactNode } from "react";
import {
  parsePurchaseOrderRevisionSnapshot,
  type PurchaseOrderRevisionSnapshot,
  type RevisionSnapshotLine,
} from "@dmx/contracts/purchase-order";
import { formatPoMoney, formatPoQuantity } from "../../lib/purchase-order.formatters";
import { resolveSnapshotLines } from "./diff";

type Props = {
  snapshotJson: unknown;
  testId?: string;
};

function present(v: string | null | undefined): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function Section({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section className="space-y-2" data-testid={testId}>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      {children}
    </section>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-900 break-words">{value}</dd>
    </div>
  );
}

function lineLabel(line: RevisionSnapshotLine): string {
  return (
    line.productName?.trim() ||
    line.description?.trim() ||
    line.productCode?.trim() ||
    line.sku?.trim() ||
    "Product line"
  );
}

function LinesTable({ lines, currency }: { lines: RevisionSnapshotLine[]; currency: string | null }) {
  if (!lines.length) return null;
  return (
    <div className="overflow-x-auto rounded border border-zinc-200">
      <table className="w-full text-sm" data-testid="po-revision-snapshot-lines">
        <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">SKU</th>
            <th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 font-medium text-right">Qty</th>
            <th className="px-3 py-2 font-medium text-right">Unit price</th>
            <th className="px-3 py-2 font-medium text-right">Line total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const sku = line.sku ?? line.productCode ?? null;
            const descParts = [lineLabel(line)];
            if (line.specification?.trim()) descParts.push(`Spec: ${line.specification.trim()}`);
            if (line.packaging?.trim()) descParts.push(`Pack: ${line.packaging.trim()}`);
            if (line.unit?.trim()) descParts.push(`Unit: ${line.unit.trim()}`);
            return (
              <tr key={`${revisionStableKey(line, i)}`} className="border-t border-zinc-100 align-top">
                <td className="px-3 py-2 font-mono text-xs">{sku ?? "—"}</td>
                <td className="px-3 py-2">{descParts.join(" · ")}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {line.quantity != null ? formatPoQuantity(line.quantity) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {line.unitPrice != null ? formatPoMoney(line.unitPrice, currency ?? "USD") : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {line.lineTotal != null
                    ? formatPoMoney(line.lineTotal, currency ?? "USD")
                    : line.unitPrice != null && line.quantity != null
                      ? formatPoMoney(line.unitPrice * line.quantity, currency ?? "USD")
                      : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function revisionStableKey(line: RevisionSnapshotLine, index: number): string {
  return `${line.sku ?? line.productCode ?? ""}|${line.description ?? line.productName ?? ""}|${index}`;
}

function SnapshotBody({ snap }: { snap: PurchaseOrderRevisionSnapshot }) {
  const h = snap.header;
  const commercial: Array<{ label: string; value: string }> = [];
  if (present(h.currency)) commercial.push({ label: "Currency", value: h.currency });
  if (present(h.incoterm)) commercial.push({ label: "Incoterm", value: h.incoterm });
  if (present(h.paymentTerms)) commercial.push({ label: "Payment terms", value: h.paymentTerms });
  if (present(h.deliveryTerms)) commercial.push({ label: "Delivery terms", value: h.deliveryTerms });
  if (present(h.expectedDeliveryDate)) {
    commercial.push({ label: "Expected delivery", value: h.expectedDeliveryDate });
  }
  if (present(h.destinationPort)) commercial.push({ label: "Destination port", value: h.destinationPort });
  const dest = h.destinationCountryCode ?? h.destinationCountry;
  if (present(dest)) commercial.push({ label: "Destination", value: dest });

  const lines = resolveSnapshotLines(snap);

  return (
    <div className="space-y-5">
      {commercial.length > 0 ? (
        <Section title="Commercial terms" testId="po-revision-snapshot-commercial">
          <dl className="space-y-1.5">
            {commercial.map((row) => (
              <Term key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
        </Section>
      ) : null}

      {present(h.buyerReference) ? (
        <Section title="Buyer reference" testId="po-revision-snapshot-buyer-ref">
          <p className="text-sm text-zinc-900">{h.buyerReference}</p>
        </Section>
      ) : null}

      {present(h.notes) ? (
        <Section title="Notes" testId="po-revision-snapshot-notes">
          <p className="text-sm text-zinc-900 whitespace-pre-wrap">{h.notes}</p>
        </Section>
      ) : null}

      {lines.length > 0 ? (
        <Section title="Products" testId="po-revision-snapshot-products">
          <LinesTable lines={lines} currency={h.currency ?? null} />
        </Section>
      ) : null}
    </div>
  );
}

/** Renders historical snapshotJson only — never live Purchase Order values. */
export function RevisionSnapshot({ snapshotJson, testId = "po-revision-snapshot" }: Props) {
  const snap = parsePurchaseOrderRevisionSnapshot(snapshotJson);
  const hasAnything =
    resolveSnapshotLines(snap).length > 0 ||
    Object.values(snap.header).some((v) => (typeof v === "string" ? v.trim() : Array.isArray(v) ? v.length : v != null));

  return (
    <div data-testid={testId} className="space-y-4">
      {!hasAnything ? (
        <p className="text-sm text-zinc-500">This revision has no snapshot details.</p>
      ) : (
        <SnapshotBody snap={snap} />
      )}
    </div>
  );
}
