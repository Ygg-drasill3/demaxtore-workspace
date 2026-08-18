import { Link } from "react-router-dom";
import type { PartnerInlandDeliverySummaryDto } from "@dmx/contracts/partner-workspace";

const QUEUE_GROUP_LABEL: Record<string, string> = {
  ACTION_REQUIRED: "Action required",
  PICKUP_TODAY: "Pickup today",
  UPCOMING_PICKUPS: "Upcoming pickups",
  READY_FOR_PICKUP: "Ready for pickup",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
};

function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function deliveryTitle(d: PartnerInlandDeliverySummaryDto): string {
  return d.shipmentRef?.trim() || "Assigned inland delivery";
}

function groupDeliveries(items: PartnerInlandDeliverySummaryDto[]) {
  const groups: Array<{ key: string; label: string; items: PartnerInlandDeliverySummaryDto[] }> = [];
  for (const d of items) {
    const key = d.queueGroup ?? "ACTION_REQUIRED";
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(d);
    } else {
      groups.push({ key, label: QUEUE_GROUP_LABEL[key] ?? humanize(key), items: [d] });
    }
  }
  return groups;
}

export function MyDeliveriesQueue({
  deliveries,
  heading = "My Deliveries",
  showViewAll = false,
}: {
  deliveries: PartnerInlandDeliverySummaryDto[];
  heading?: string;
  showViewAll?: boolean;
}) {
  const groups = groupDeliveries(deliveries);

  return (
    <section className="space-y-3" data-testid="my-deliveries" id="my-deliveries">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium">{heading}</h2>
        {showViewAll && (
          <Link className="text-sm underline" to="/partner/inland" data-testid="my-deliveries-view-all">
            View all
          </Link>
        )}
      </div>

      {deliveries.length === 0 ? (
        <p className="text-sm text-zinc-500" data-testid="my-deliveries-empty">
          No assigned inland deliveries yet.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.key} className="space-y-1" data-testid={`inland-queue-group-${g.key}`}>
              {groups.length > 1 && (
                <p className="text-xs uppercase tracking-wide text-zinc-500 px-1">{g.label}</p>
              )}
              <ul className="divide-y rounded-lg border">
                {g.items.map((d) => (
                  <li
                    key={d.inlandDeliveryId}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                    data-testid={`inland-delivery-row-${d.shipmentRef ?? d.inlandDeliveryId}`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate" data-testid="inland-delivery-title">
                        {deliveryTitle(d)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {humanize(d.status)}
                        {d.containerNumber ? ` · ${d.containerNumber}` : ""}
                        {d.pickupLocation ? ` · Pickup ${d.pickupLocation}` : ""}
                        {d.deliveryCity ? ` · ${d.deliveryCity}` : ""}
                        {d.pickupAt ? ` · Pickup ${new Date(d.pickupAt).toLocaleString()}` : ""}
                        {d.nextAction ? ` · Next: ${d.nextAction}` : ""}
                      </p>
                    </div>
                    <Link
                      className="shrink-0 underline"
                      to={`/partner/inland/${d.inlandDeliveryId}`}
                      data-testid={`open-inland-delivery-${d.shipmentRef ?? d.inlandDeliveryId}`}
                    >
                      Open Delivery
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
