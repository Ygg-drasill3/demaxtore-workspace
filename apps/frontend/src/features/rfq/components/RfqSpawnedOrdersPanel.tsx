import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { rfqApi } from "../lib/rfq.api";
import { OrderStateBadge } from "@/features/order/components/OrderStateBadge";
import { ExternalLink } from "lucide-react";

interface SpawnedOrder {
  id: string;
  externalRef: string;
  state: string;
  createdAt: string;
}

export function RfqSpawnedOrdersPanel({ workspaceId }: { workspaceId: string }) {
  const { data: spawnedOrders } = useQuery({
    queryKey: ["rfq", workspaceId, "spawned-orders"],
    queryFn: () => rfqApi.spawnedOrders(workspaceId),
  });

  const orders = (spawnedOrders ?? []) as SpawnedOrder[];
  if (orders.length === 0) return null;

  return (
    <section data-testid="rfq-spawned-orders" className="dmx-card p-5 space-y-3">
      <div>
        <div className="dmx-eyebrow text-zinc-500">Order created</div>
        <h2 className="text-lg font-semibold text-ink-900 mt-1">Track your order</h2>
        <p className="text-sm text-zinc-600 mt-1">
          Your purchase order created an order. Open it to follow production and shipment.
        </p>
      </div>
      <ul className="divide-y divide-zinc-100">
        {orders.map((o) => (
          <li
            key={o.id}
            data-testid={`rfq-spawned-order-${o.id}`}
            className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div className="min-w-0 space-y-1">
              <div className="font-mono text-sm text-ink-900">{o.externalRef}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <OrderStateBadge state={o.state} />
                <span>Created {new Date(o.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <Link
              to={`/workspace/order/${o.id}`}
              data-testid={`rfq-open-order-${o.id}`}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800"
            >
              Open order
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
