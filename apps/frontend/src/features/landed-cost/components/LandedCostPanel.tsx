import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isTurkeyImporterOperatingModel } from "@dmx/contracts/buyer-operating-model";
import { useAuth } from "@/store/auth.store";
import { landedCostApi } from "../lib/landed-cost.api";
import { toast } from "@/store/toast.store";

/** Compact Shipment Workspace landed cost panel. */
export function LandedCostPanel({ shipmentWorkspaceId }: { shipmentWorkspaceId: string }) {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const turkey = isTurkeyImporterOperatingModel(user?.buyerOperatingModel);
  const { data, isLoading } = useQuery({
    queryKey: ["landed-cost", "shipment", shipmentWorkspaceId],
    queryFn: () => landedCostApi.byShipment(shipmentWorkspaceId),
  });

  const calc = useMutation({
    mutationFn: () =>
      landedCostApi.calculate({
        shipmentWorkspaceId,
        calculationCurrency: "USD",
        fxRates: { TRY: 1 / 30, EUR: 1.08 },
      }),
    onSuccess: () => {
      toast.success("Landed cost calculated");
      void qc.invalidateQueries({ queryKey: ["landed-cost"] });
    },
    onError: () => toast.error("Could not calculate landed cost"),
  });

  if (isLoading) return null;

  return (
    <section
      className="rounded-xl border border-paper-200 bg-white p-4 space-y-3"
      data-testid="landed-cost-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Landed cost</p>
          <h2 className="text-lg font-semibold text-zinc-900">
            {data?.displayLabel ?? "Landed cost"}
          </h2>
          <p className="text-xs text-zinc-500">Customer costs only — no DeMaxtore margin.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg bg-accent-900 px-3 py-1.5 text-sm text-white"
            disabled={calc.isPending}
            onClick={() => calc.mutate()}
            data-testid="calculate-landed-cost"
          >
            {data ? "Recalculate" : "Calculate"}
          </button>
          {data && turkey && (
            <Link
              to={`/buyer/landed-cost/${data.id}`}
              className="rounded-lg border px-3 py-1.5 text-sm"
              data-testid="view-landed-cost"
            >
              View breakdown
            </Link>
          )}
        </div>
      </div>

      {data ? (
        <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
          <div>
            <dt className="text-xs text-zinc-500">Status</dt>
            <dd className="font-medium">{data.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Goods</dt>
            <dd className="font-medium">
              {data.goodsCost != null ? data.goodsCost.toLocaleString() : "Missing"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Freight</dt>
            <dd className="font-medium">
              {data.freightCost != null ? `${data.freightCost.toLocaleString()} EST` : "Missing"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Duty & Tax</dt>
            <dd className="font-medium">
              {data.dutyTaxCost != null ? `${data.dutyTaxCost.toLocaleString()} EST` : "Not available"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Inland</dt>
            <dd className="font-medium">
              {data.inlandCost != null ? data.inlandCost.toLocaleString() : "Not provided"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Total</dt>
            <dd className="font-medium">
              {data.totalLandedCost != null
                ? `${data.totalLandedCost.toLocaleString()} ${data.calculationCurrency}`
                : `Subtotal ${data.knownSubtotal.toLocaleString()} (incomplete)`}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-zinc-600">
          No calculation yet. Calculate to roll up goods, freight, duty/tax, inland, and manual costs.
        </p>
      )}
    </section>
  );
}
