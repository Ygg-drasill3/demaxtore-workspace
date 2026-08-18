import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { PartnerRole } from "@dmx/contracts/partner-workspace";
import { customsApi } from "@/features/customs/lib/customs.api";

/** Secondary path: assigned broker on an assigned Turkey shipment → existing case. */
export function PartnerShipmentCustomsLink({
  workspaceId,
  partnerRole,
}: {
  workspaceId: string;
  partnerRole: PartnerRole | string;
}) {
  const enabled = partnerRole === "CUSTOMS_BROKER" && !!workspaceId;
  const { data, isError } = useQuery({
    queryKey: ["customs", "eligibility", workspaceId],
    queryFn: () => customsApi.eligibility(workspaceId),
    enabled,
  });

  if (!enabled || isError || !data?.customsCaseId) return null;

  return (
    <section className="rounded-lg border p-3" data-testid="partner-shipment-customs">
      <p className="text-xs uppercase tracking-wide text-zinc-500">Turkey Customs</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-700">
          Status: <strong>{(data.status ?? "—").replace(/_/g, " ")}</strong>
          {data.readinessStatus ? ` · ${data.readinessStatus.replace(/_/g, " ")}` : ""}
        </p>
        <Link
          className="underline text-sm"
          to={`/partner/customs/${data.customsCaseId}`}
          data-testid="partner-open-customs-case"
        >
          Open Customs Case
        </Link>
      </div>
    </section>
  );
}
