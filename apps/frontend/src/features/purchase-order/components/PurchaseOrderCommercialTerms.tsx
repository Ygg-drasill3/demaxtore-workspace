import type { PurchaseOrder } from "@dmx/contracts/purchase-order";
import { formatPoDate } from "../lib/purchase-order.formatters";
import { PurchaseOrderEmptyValue } from "./PurchaseOrderEmptyValue";

export function PurchaseOrderCommercialTerms({ po }: { po: PurchaseOrder }) {
  return (
    <section data-testid="po-commercial-terms" className="dmx-card p-4 space-y-3">
      <h2 className="font-medium">Commercial terms</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">Currency</dt>
          <dd data-testid="po-term-currency">{po.currency}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Incoterm</dt>
          <dd data-testid="po-term-incoterm"><PurchaseOrderEmptyValue value={po.incoterm} /></dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-zinc-500">Payment terms</dt>
          <dd data-testid="po-term-payment" className="whitespace-pre-wrap">
            <PurchaseOrderEmptyValue value={po.paymentTerms} />
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-zinc-500">Delivery terms</dt>
          <dd data-testid="po-term-delivery" className="whitespace-pre-wrap">
            <PurchaseOrderEmptyValue value={po.deliveryTerms} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Expected delivery date</dt>
          <dd data-testid="po-term-expected-delivery">
            {po.expectedDeliveryDate ? formatPoDate(po.expectedDeliveryDate) : <PurchaseOrderEmptyValue value={null} />}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Destination country</dt>
          <dd data-testid="po-term-destination-country">
            <PurchaseOrderEmptyValue value={po.destinationCountry} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Destination port</dt>
          <dd data-testid="po-term-destination-port">
            <PurchaseOrderEmptyValue value={po.destinationPort} />
          </dd>
        </div>
      </dl>
    </section>
  );
}
