import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { landedCostApi } from "../lib/landed-cost.api";
import { toast } from "@/store/toast.store";

export default function LandedCostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["landed-cost", "detail", id],
    queryFn: () => landedCostApi.get(id!),
    enabled: !!id,
  });

  const recalculate = useMutation({
    mutationFn: () => {
      if (!data?.shipmentWorkspaceId) throw new Error("Missing shipment");
      return landedCostApi.calculate({
        shipmentWorkspaceId: data.shipmentWorkspaceId,
        calculationCurrency: data.calculationCurrency || "USD",
        fxRates: { TRY: 1 / 34, EUR: 1.08 },
      });
    },
    onSuccess: async (next) => {
      toast.success("Landed cost recalculated");
      await qc.invalidateQueries({ queryKey: ["landed-cost"] });
      if (next?.id && next.id !== id) {
        window.location.assign(`/buyer/landed-cost/${next.id}`);
      } else {
        void refetch();
      }
    },
    onError: (err: any) => {
      const e = err?.response?.data?.error;
      toast.error(typeof e === "string" ? e : e?.message ?? e?.code ?? "Recalculate failed");
    },
  });

  if (isLoading) return <p className="p-6 text-sm text-zinc-500">Loading…</p>;
  if (isError || !data) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Failed to load calculation.</p>
        <button type="button" className="text-sm underline" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const rows = [
    { label: "Goods", value: data.goodsCost },
    { label: "Freight", value: data.freightCost },
    { label: "Insurance", value: data.insuranceCost },
    { label: "Duty & Tax", value: data.dutyTaxCost },
    { label: "Customs / Local", value: data.customsLocalCost },
    { label: "Inland", value: data.inlandCost },
    { label: "Other", value: data.otherCost },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6" data-testid="landed-cost-detail-page">
      <header className="space-y-1">
        <Link to="/buyer/landed-cost" className="text-xs text-blue-600 hover:underline">
          ← Back
        </Link>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Landed Cost</p>
        <h1 className="text-2xl font-semibold">{data.displayLabel}</h1>
        <p className="text-sm text-zinc-600">
          v{data.version} · {data.status} · {data.completeness} · {data.calculationCurrency}
        </p>
        {data.shipmentWorkspaceId && (
          <Link
            className="text-sm text-blue-600 underline"
            to={`/workspace/shipment/${data.shipmentWorkspaceId}`}
          >
            Open Shipment
          </Link>
        )}
      </header>

      <section className="rounded-xl border border-paper-200 bg-white p-4 space-y-2">
        <h2 className="text-lg font-medium">Summary</h2>
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between text-sm">
            <span className="text-zinc-500">{r.label}</span>
            <span className="font-medium tabular-nums">
              {r.value != null ? r.value.toLocaleString() : "Not provided"}
            </span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 text-sm font-semibold">
          <span>Known subtotal</span>
          <span className="tabular-nums">{data.knownSubtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span>{data.status === "INCOMPLETE" ? "Total (incomplete)" : "Total"}</span>
          <span className="tabular-nums">
            {data.totalLandedCost != null ? data.totalLandedCost.toLocaleString() : "—"}
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          Estimated portion: {data.estimatedAmount.toLocaleString()} · Actual portion:{" "}
          {data.actualAmount.toLocaleString()}
        </p>
        {data.diagnostics.length > 0 && (
          <p className="text-xs text-amber-700" data-testid="landed-cost-diagnostics">
            Diagnostics: {data.diagnostics.join(", ")}
          </p>
        )}
        <button
          type="button"
          className="mt-3 rounded-lg bg-accent-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          disabled={recalculate.isPending || !data.shipmentWorkspaceId}
          data-testid="recalculate-landed-cost"
          onClick={() => recalculate.mutate()}
        >
          {recalculate.isPending ? "Recalculating…" : "Recalculate Landed Cost"}
        </button>
      </section>

      <section className="rounded-xl border border-paper-200 bg-white p-4">
        <h2 className="text-lg font-medium mb-2">Components</h2>
        <ul className="divide-y text-sm">
          {data.components.map((c) => (
            <li key={c.id} className="py-2 flex justify-between gap-3">
              <div>
                <p className="font-medium">
                  {c.componentType.replace(/_/g, " ")} · {c.inclusion.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-zinc-500">
                  {c.costNature} · {c.sourceType.replace(/_/g, " ")}
                  {c.description ? ` · ${c.description}` : ""}
                </p>
              </div>
              <div className="text-right tabular-nums">
                {c.inclusion === "INCLUDED" && c.amountCalculationCurrency != null
                  ? c.amountCalculationCurrency.toLocaleString()
                  : c.inclusion === "OPTIONAL_ABSENT"
                    ? "Not provided"
                    : c.inclusion === "MISSING"
                      ? "Missing"
                      : "—"}
                {c.currencyOriginal && c.amountOriginal != null ? (
                  <p className="text-xs text-zinc-400">
                    {c.amountOriginal} {c.currencyOriginal}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
