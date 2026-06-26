import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mixedContainerApi } from "../lib/mixed-container.api";
import { Button } from "@/components/ui/Button";
import { FillMeter } from "../components/FillMeter";
import { toast } from "@/store/toast.store";
import { useState } from "react";
import { QueryState } from "@/components/ui/QueryState";
import { useT } from "@/i18n/useT";

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function MixedContainerBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { t } = useT();
  const { data: mc, isLoading, isError, refetch } = useQuery({
    queryKey: ["mc-container", id],
    queryFn: () => mixedContainerApi.get(id!),
    enabled: !!id,
  });

  const editable = mc && ["MC_DRAFT", "MC_BUILDING"].includes(mc.state);
  const submitted = mc?.state === "MC_PRICING_REQUESTED";

  const refresh = () => qc.invalidateQueries({ queryKey: ["mc-container", id] });

  const updatePallets = async (lineId: string, delta: number, current: number, moq: number) => {
    const next = current + delta;
    if (next < moq) return;
    try {
      await mixedContainerApi.updateLine(id!, lineId, next);
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? t("mc.builder.updateFailed"));
    }
  };

  const removeLine = async (lineId: string) => {
    try {
      await mixedContainerApi.removeLine(id!, lineId);
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? t("mc.builder.updateFailed"));
    }
  };

  const requestPricing = async () => {
    setSubmitting(true);
    try {
      await mixedContainerApi.requestPricing(id!);
      toast.success("Pricing request submitted");
      await refresh();
      await qc.invalidateQueries({ queryKey: ["mc-requests"] });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError || (!isLoading && !mc)}
      onRetry={() => void refetch()}
      errorMessage={t("mc.builder.error")}
    >
      {mc ? (
    <div data-testid="mc-builder-page" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header>
        <Link to="/buyer/mixed-container/requests" className="text-xs text-zinc-500 hover:underline">← My Containers</Link>
        <span className="dmx-eyebrow text-zinc-500 block mt-2">Container Builder · {mc.externalRef}</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Plan Your Container</h1>
        <p className="text-sm text-zinc-500 mt-1">Planning workspace — not a shopping cart.</p>
      </header>

      {submitted && (
        <div data-testid="mc-pricing-submitted" className="dmx-card p-5 bg-green-50 border-green-200">
          <h2 className="font-medium text-green-900">Your request has been submitted</h2>
          <p className="text-sm text-green-800 mt-1">
            DeMaxtore will source live supplier pricing. Expected response time: 24–48 hours.
          </p>
        </div>
      )}

      {mc.activeOfferId && ["MC_BUYER_REVIEW", "MC_APPROVED", "MC_REVISION_REQUESTED"].includes(mc.state) && (
        <div className="dmx-card p-5 bg-accent-50 border-accent-100">
          <h2 className="font-medium">Live pricing offer available</h2>
          <p className="text-sm text-zinc-600 mt-1">Review your container offer, approve, or request revisions.</p>
          <Link to={`/buyer/mixed-container/offers/${mc.activeOfferId}`} className="inline-block mt-3">
            <Button data-testid="mc-view-offer">View Container Offer</Button>
          </Link>
        </div>
      )}

      {["MC_APPROVED", "MC_ALLOCATION_IN_PROGRESS", "MC_PROFORMA_PENDING", "MC_PAYMENT_TRACKING"].includes(mc.state) && (
        <div className="dmx-card p-5 bg-green-50 border-green-100">
          <h2 className="font-medium">Container coordination</h2>
          <p className="text-sm text-zinc-600 mt-1">Track allocations, proformas, and supplier payments.</p>
          <Link to={`/buyer/mixed-container/coordination/${mc.id}`} className="inline-block mt-3">
            <Button variant="secondary" data-testid="mc-view-coordination-builder">View Coordination</Button>
          </Link>
        </div>
      )}

      {["MC_EXECUTION_READY", "MC_EXECUTION_ACTIVE", "MC_EXECUTION_COMPLETE"].includes(mc.state) && (
        <div className="dmx-card p-5 bg-blue-50 border-blue-100">
          <h2 className="font-medium">SmartContainer execution</h2>
          <p className="text-sm text-zinc-600 mt-1">Track order, freight, and shipment progress for your container.</p>
          <Link to={`/buyer/mixed-container/execution/${mc.id}`} className="inline-block mt-3">
            <Button variant="secondary" data-testid="mc-view-execution-builder">View Execution</Button>
          </Link>
        </div>
      )}

      {editable && (
        <div className="dmx-card p-5 bg-blue-50 border-blue-100 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-blue-900 max-w-xl">
            Add products by pallet, then request live pricing. Partial containers are allowed — you may continue with unused pallet capacity.
          </p>
          <div className="flex gap-2">
            <Link to={`/buyer/mixed-container/catalog?containerId=${mc.id}`}>
              <Button variant="secondary" data-testid="mc-continue-browsing">Continue Browsing</Button>
            </Link>
            <Button
              data-testid="mc-request-pricing"
              disabled={mc.lines.length === 0 || submitting}
              onClick={() => void requestPricing()}
            >
              Request Live Pricing
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 dmx-card p-5">
          <h2 className="font-medium mb-4">Product Breakdown</h2>
          {mc.lines.length === 0 ? (
            <p className="text-sm text-zinc-500">No products yet. <Link to="/buyer/mixed-container/catalog" className="text-accent-900 underline">Browse catalog</Link></p>
          ) : (
            <table className="w-full text-sm" data-testid="mc-product-breakdown">
              <thead className="text-xs uppercase text-zinc-500">
                <tr>
                  <th className="text-left pb-2">Product</th>
                  <th className="text-left pb-2">Pallets</th>
                  <th className="text-left pb-2">Indicative/pallet</th>
                  {editable && <th className="pb-2"></th>}
                </tr>
              </thead>
              <tbody>
                {mc.lines.map((line) => (
                  <tr key={line.id} data-testid={`mc-line-${line.productRef}`} className="border-t border-zinc-100">
                    <td className="py-3">
                      <div className="font-medium">{line.name}</div>
                      <div className="text-xs text-zinc-500">{line.category}</div>
                    </td>
                    <td className="py-3">
                      {editable ? (
                        <div className="flex items-center gap-2">
                          <button type="button" className="h-7 w-7 border rounded" data-testid={`mc-line-dec-${line.id}`} onClick={() => void updatePallets(line.id, -1, line.palletCount, line.moqPallets)}>−</button>
                          <span data-testid={`mc-line-pallets-${line.id}`}>{line.palletCount}</span>
                          <button type="button" className="h-7 w-7 border rounded" data-testid={`mc-line-inc-${line.id}`} onClick={() => void updatePallets(line.id, 1, line.palletCount, line.moqPallets)}>+</button>
                        </div>
                      ) : line.palletCount}
                    </td>
                    <td className="py-3 text-zinc-600">
                      {fmtMoney(line.indicativeUnitLow)} – {fmtMoney(line.indicativeUnitHigh)}
                    </td>
                    {editable && (
                      <td className="py-3">
                        <button type="button" className="text-red-600 text-xs" data-testid={`mc-line-remove-${line.id}`} onClick={() => void removeLine(line.id)}>Remove</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="dmx-card p-5 space-y-4" data-testid="mc-container-summary">
          <h2 className="font-medium">Container Summary</h2>
          <div>
            <label className="text-xs uppercase text-zinc-500">Container type</label>
            <p className="text-sm mt-1">{mc.containerType.replace("CONTAINER_", "").replace("_", " ")}</p>
          </div>
          <FillMeter
            used={mc.currentPalletCount}
            max={mc.maxPalletCapacity}
            percent={mc.fillPercent}
          />
          <p className="text-xs text-zinc-500" data-testid="mc-partial-message">
            Partial containers are allowed. You may continue with unused pallet capacity.
          </p>
          <div>
            <label className="text-xs uppercase text-zinc-500">Estimated value range</label>
            <p className="text-2xl font-display font-semibold mt-1" data-testid="mc-est-value">
              {fmtMoney(mc.estValueMin)} – {fmtMoney(mc.estValueMax)}
            </p>
            <p className="text-[10px] text-amber-700 mt-1">Estimated value only — not final supplier pricing</p>
          </div>
        </div>
      </div>
    </div>
      ) : null}
    </QueryState>
  );
}
