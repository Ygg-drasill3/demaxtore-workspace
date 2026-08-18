import { useQuery } from "@tanstack/react-query";
import { partnerApi } from "../lib/partner.api";
import { MyDeliveriesQueue } from "../components/MyDeliveriesQueue";

export default function PartnerInlandDeliveriesPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["partner", "home"],
    queryFn: partnerApi.home,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6" data-testid="partner-inland-deliveries-page">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Partner Workspace</p>
        <h1 className="text-2xl font-semibold">My Deliveries</h1>
        <p className="text-sm text-zinc-600">
          Assigned inland deliveries only — not an organisation-wide list.
        </p>
      </header>

      {isLoading && <p className="text-sm text-zinc-500">Loading assigned deliveries…</p>}
      {isError && (
        <div>
          <p className="text-sm text-red-600">Failed to load inland deliveries.</p>
          <button type="button" className="text-sm underline" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      )}

      {data && (
        <MyDeliveriesQueue deliveries={data.inlandDeliveries ?? []} heading="Assigned deliveries" />
      )}
    </div>
  );
}
