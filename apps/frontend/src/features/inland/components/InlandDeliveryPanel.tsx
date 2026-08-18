import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inlandApi } from "../lib/inland.api";
import { customsApi } from "@/features/customs/lib/customs.api";
import { toast } from "@/store/toast.store";
import { useAuth } from "@/store/auth.store";

/** Shipment Workspace — inland summary after Turkey customs clearance path. */
export function InlandDeliveryPanel({ shipmentWorkspaceId }: { shipmentWorkspaceId: string }) {
  const qc = useQueryClient();
  const role = useAuth((s) => s.user?.role);
  const inlandPath = role === "TRUCKER" || role === "CUSTOMS_BROKER" ? "/partner/inland" : "/buyer/inland";
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const { data: eligibility } = useQuery({
    queryKey: ["customs", "eligibility", shipmentWorkspaceId],
    queryFn: () => customsApi.eligibility(shipmentWorkspaceId),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["inland", "shipment", shipmentWorkspaceId],
    queryFn: () => inlandApi.byShipment(shipmentWorkspaceId),
    enabled: !!eligibility?.eligible || !!eligibility?.customsCaseId,
  });

  const request = useMutation({
    mutationFn: () =>
      inlandApi.request({
        shipmentWorkspaceId,
        deliveryAddress: address.trim() || "Buyer warehouse (to confirm)",
        deliveryCity: city.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Inland delivery requested");
      void qc.invalidateQueries({ queryKey: ["inland"] });
    },
    onError: () => toast.error("Could not request inland delivery"),
  });

  if (!eligibility?.eligible) return null;
  if (isLoading) return null;

  const cleared = eligibility.status === "CLEARED" || data?.customsCleared;

  return (
    <section
      className="rounded-xl border border-paper-200 bg-white p-4 space-y-3"
      data-testid="inland-delivery-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Inland Delivery</p>
          <h2 className="text-lg font-semibold text-zinc-900">Turkey inland execution</h2>
          <p className="text-xs text-zinc-500">Customs cleared → pickup → delivery → POD</p>
        </div>
        {data ? (
          <Link
            to={`${inlandPath}/${data.id}`}
            className="rounded-lg bg-accent-900 px-3 py-1.5 text-sm font-medium text-white"
            data-testid="open-inland-delivery"
          >
            Open Delivery
          </Link>
        ) : null}
      </div>

      {data ? (
        <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
          <div>
            <dt className="text-xs text-zinc-500">Customs</dt>
            <dd className="font-medium">{data.customsCleared ? "CLEARED" : "Pending"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Trucker</dt>
            <dd className="font-medium">{data.truckerUserId ? "Assigned" : "Not assigned"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Pickup</dt>
            <dd className="font-medium">
              {data.pickupAt ? new Date(data.pickupAt).toLocaleString() : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Status</dt>
            <dd className="font-medium">{data.status.replace(/_/g, " ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Destination</dt>
            <dd className="font-medium">{data.deliveryCity ?? data.deliveryAddress ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">POD</dt>
            <dd className="font-medium">{data.podStatus.replace(/_/g, " ")}</dd>
          </div>
        </dl>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-zinc-600">
            {cleared
              ? "Customs cleared — request inland delivery to assign a trucker."
              : "Inland physical pickup requires customs CLEARED. You may still prepare a delivery request."}
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded border px-2 py-1 text-sm min-w-[220px]"
              placeholder="Delivery address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <input
              className="rounded border px-2 py-1 text-sm"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <button
              type="button"
              className="rounded-lg bg-accent-900 px-3 py-1.5 text-sm text-white"
              disabled={request.isPending}
              onClick={() => request.mutate()}
              data-testid="request-inland-delivery"
            >
              Request Inland Delivery
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
