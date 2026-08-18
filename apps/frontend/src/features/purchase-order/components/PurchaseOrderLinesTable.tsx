import type { PurchaseOrderLine } from "@dmx/contracts/purchase-order";
import {
  formatPoMoney,
  formatPoQuantity,
  formatPoUnit,
  summarizeLinePricing,
} from "../lib/purchase-order.formatters";
import { PurchaseOrderEmptyValue } from "./PurchaseOrderEmptyValue";

export function PurchaseOrderLinesTable({
  lines,
  currency,
}: {
  lines: PurchaseOrderLine[];
  currency: string;
}) {
  const pricing = summarizeLinePricing(lines);

  return (
    <section data-testid="po-lines" className="dmx-card p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="font-medium">Purchase Order lines</h2>
        <p className="text-sm text-zinc-500" data-testid="po-lines-count">
          {lines.length} {lines.length === 1 ? "line" : "lines"}
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-zinc-500">
            <tr>
              <th className="py-2 pr-2">Line</th>
              <th className="py-2 pr-2">Product</th>
              <th className="py-2 pr-2">Product Code</th>
              <th className="py-2 pr-2">Description / Quality</th>
              <th className="py-2 pr-2">Packaging</th>
              <th className="py-2 pr-2">Quantity</th>
              <th className="py-2 pr-2">Unit</th>
              <th className="py-2 pr-2">Unit Price</th>
              <th className="py-2">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => (
              <tr key={l.id} data-testid={`po-line-${l.id}`} className="border-t border-zinc-100 align-top">
                <td className="py-2 pr-2 text-zinc-500">{idx + 1}</td>
                <td className="py-2 pr-2 font-medium">{l.productName ?? l.description}</td>
                <td className="py-2 pr-2">
                  <PurchaseOrderEmptyValue value={l.productCode ?? l.sku} />
                </td>
                <td className="py-2 pr-2 text-zinc-600 whitespace-pre-wrap">
                  {[l.description !== l.productName ? l.description : null, l.specification]
                    .filter(Boolean)
                    .join("\n") || "Not specified"}
                </td>
                <td className="py-2 pr-2">
                  <PurchaseOrderEmptyValue value={l.packaging} />
                </td>
                <td className="py-2 pr-2">{formatPoQuantity(l.quantity)}</td>
                <td className="py-2 pr-2">{formatPoUnit(l.unit)}</td>
                <td className="py-2 pr-2">
                  {l.unitPrice == null ? (
                    <PurchaseOrderEmptyValue value={null} />
                  ) : (
                    formatPoMoney(l.unitPrice, currency)
                  )}
                </td>
                <td className="py-2">
                  {l.lineTotal == null && l.unitPrice == null ? (
                    <PurchaseOrderEmptyValue value={null} />
                  ) : (
                    formatPoMoney(
                      l.lineTotal ?? (l.unitPrice != null ? Number(l.unitPrice) * Number(l.quantity) : null),
                      currency,
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="md:hidden space-y-3">
        {lines.map((l, idx) => (
          <li
            key={l.id}
            data-testid={`po-line-card-${l.id}`}
            className="rounded-lg border border-zinc-100 p-3 space-y-2 text-sm"
          >
            <div className="flex justify-between gap-2">
              <span className="text-xs text-zinc-500">Line {idx + 1}</span>
              <span className="font-medium text-right">{l.productName ?? l.description}</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-zinc-500">Product code</dt>
              <dd><PurchaseOrderEmptyValue value={l.productCode ?? l.sku} /></dd>
              <dt className="text-zinc-500">Quantity</dt>
              <dd>{formatPoQuantity(l.quantity)} {formatPoUnit(l.unit)}</dd>
              <dt className="text-zinc-500">Unit price</dt>
              <dd>
                {l.unitPrice == null ? <PurchaseOrderEmptyValue value={null} /> : formatPoMoney(l.unitPrice, currency)}
              </dd>
              <dt className="text-zinc-500">Line total</dt>
              <dd>
                {l.lineTotal == null && l.unitPrice == null
                  ? <PurchaseOrderEmptyValue value={null} />
                  : formatPoMoney(
                      l.lineTotal ?? (l.unitPrice != null ? Number(l.unitPrice) * Number(l.quantity) : null),
                      currency,
                    )}
              </dd>
              {l.packaging ? (
                <>
                  <dt className="text-zinc-500">Packaging</dt>
                  <dd>{l.packaging}</dd>
                </>
              ) : null}
              {l.specification ? (
                <>
                  <dt className="text-zinc-500">Quality</dt>
                  <dd className="whitespace-pre-wrap col-span-1">{l.specification}</dd>
                </>
              ) : null}
            </dl>
          </li>
        ))}
      </ul>

      <div
        data-testid="po-lines-subtotal"
        className="border-t border-zinc-100 pt-3 text-sm flex flex-wrap items-center justify-between gap-2"
      >
        <span className="text-zinc-500">Subtotal</span>
        {pricing.kind === "full" && (
          <span className="font-medium">{formatPoMoney(pricing.subtotal, currency)}</span>
        )}
        {pricing.kind === "none" && <PurchaseOrderEmptyValue value={null} />}
        {pricing.kind === "partial" && (
          <span className="text-amber-800" data-testid="po-lines-partial-pricing">
            Partial pricing — some lines have no unit price
          </span>
        )}
      </div>
    </section>
  );
}
