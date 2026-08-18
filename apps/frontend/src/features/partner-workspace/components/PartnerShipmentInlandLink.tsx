import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { PartnerRole } from "@dmx/contracts/partner-workspace";
import { inlandApi } from "@/features/inland/lib/inland.api";

/** Secondary path: assigned trucker on an assigned shipment → existing inland delivery. */
export function PartnerShipmentInlandLink({
  workspaceId,
  partnerRole,
}: {
  workspaceId: string;
  partnerRole: PartnerRole | string;
}) {
  const enabled = partnerRole === "TRUCKER" && !!workspaceId;
  const { data, isError } = useQuery({
    queryKey: ["inland", "shipment", workspaceId],
    queryFn: () => inlandApi.byShipment(workspaceId),
    enabled,
    retry: false,
  });

  if (!enabled || isError || !data?.id) return null;

  return (
    <section className="rounded-lg border p-3" data-testid="partner-shipment-inland">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Inland Delivery</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-700">
          Status: <strong>{(data.status ?? "—").replace(/_/g, " ")}</strong>
          {data.deliveryCity ? ` · ${data.deliveryCity}` : ""}
          {data.nextAction ? ` · Next: ${data.nextAction}` : ""}
        </p>
        <Link
          className="underline text-sm"
          to={`/partner/inland/${data.id}`}
          data-testid="partner-open-inland-delivery"
        >
          Open Delivery
        </Link>
      </div>
    </section>
  );
}
