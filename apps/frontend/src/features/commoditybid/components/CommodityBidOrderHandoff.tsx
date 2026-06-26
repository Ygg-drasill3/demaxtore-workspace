import { Link } from "react-router-dom";
import { Package } from "lucide-react";

interface OrderRow {
  id: string;
  externalRef: string;
}

export function CommodityBidOrderHandoff({ orders }: { orders: OrderRow[] }) {
  if (!orders.length) return null;

  return (
    <section data-testid="cb-order-handoff" className="dmx-card p-5 border-emerald-200 bg-emerald-50/40">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 grid place-items-center shrink-0">
          <Package className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="dmx-eyebrow text-emerald-800">Post-auction handoff</span>
          <h3 className="font-display text-lg font-semibold mt-0.5 text-emerald-950">
            Your order{orders.length > 1 ? "s are" : " is"} being prepared
          </h3>
          <p className="text-sm text-emerald-900/80 mt-1">
            Production, freight, and shipment coordination continue in the order workspace.
          </p>
          <ul className="mt-3 space-y-1.5">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  to={`/workspace/order/${o.id}`}
                  data-testid={`cb-handoff-order-${o.id}`}
                  className="text-sm font-medium text-emerald-900 hover:underline"
                >
                  Open order {o.externalRef} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
