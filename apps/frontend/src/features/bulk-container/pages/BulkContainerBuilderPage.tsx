import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bulkContainerApi } from "../lib/bulk-container.api";
import { Button } from "@/components/ui/Button";
import { CapacityMeter } from "../components/CapacityMeter";
import { BC_STATE_LABELS } from "@dmx/contracts/bulk-container.fsm";
import { toast } from "@/store/toast.store";
import { useState } from "react";
import { QueryState } from "@/components/ui/QueryState";
import { useT } from "@/i18n/useT";

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtSpec(specValues: Record<string, string | number>): string {
  return Object.entries(specValues)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

export default function BulkContainerBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { t } = useT();
  const { data: bc, isLoading, isError, refetch } = useQuery({
    queryKey: ["bc-container", id],
    queryFn: () => bulkContainerApi.get(id!),
    enabled: !!id,
  });

  const editable = bc && ["BC_DRAFT", "BC_BUILDING"].includes(bc.state);
  const submitted = bc?.state === "BC_SUBMITTED";

  const refresh = () => qc.invalidateQueries({ queryKey: ["bc-container", id] });

  const updateMt = async (lineId: string, delta: number, current: number, minOrder: number) => {
    const next = Math.round((current + delta) * 10) / 10;
    if (next < minOrder) return;
    try {
      await bulkContainerApi.updateLine(id!, lineId, { quantityMt: next });
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? t("bc.builder.updateFailed"));
    }
  };

  const removeLine = async (lineId: string) => {
    try {
      await bulkContainerApi.removeLine(id!, lineId);
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? t("bc.builder.updateFailed"));
    }
  };

  const submitRequest = async () => {
    setSubmitting(true);
    try {
      await bulkContainerApi.submitRequest(id!);
      toast.success("Procurement request submitted");
      await refresh();
      await qc.invalidateQueries({ queryKey: ["bc-requests"] });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const stateLabel = BC_STATE_LABELS[bc?.state as keyof typeof BC_STATE_LABELS] ?? bc?.state;

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError || (!isLoading && !bc)}
      onRetry={() => void refetch()}
      errorMessage={t("bc.builder.error")}
    >
      {bc ? (
    <div data-testid="bc-builder-page" className="max-w-[1200px] mx-auto space-y-6 animate-fade-in">
      <header>
        <Link to="/buyer/bulk-container/requests" className="text-xs text-zinc-500 hover:underline">← My Requests</Link>
        <span className="dmx-eyebrow text-zinc-500 block mt-2">Container Builder · {bc.externalRef}</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Plan Your Bulk Container</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {stateLabel} · Planning workspace — not a shopping cart.
        </p>
      </header>

      {submitted && (
        <div data-testid="bc-request-submitted" className="dmx-card p-5 bg-green-50 border-green-200">
          <h2 className="font-medium text-green-900">Your procurement request has been submitted</h2>
          <p className="text-sm text-green-800 mt-1">
            DeMaxtore operations will source suppliers for your specification lines.
          </p>
        </div>
      )}

      {editable && (
        <div className="dmx-card p-5 bg-blue-50 border-blue-100 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-blue-900 max-w-xl">
            Add specification lines by metric ton, then submit your procurement request.
            Partial containers below 20 MT are allowed with a warning.
          </p>
          <div className="flex gap-2">
            <Link to={`/buyer/bulk-container/catalog?containerId=${bc.id}`}>
              <Button variant="secondary">Continue Browsing</Button>
            </Link>
            <Button
              data-testid="bc-submit-request"
              disabled={bc.lines.length === 0 || submitting}
              onClick={() => void submitRequest()}
            >
              Submit Procurement Request
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 dmx-card p-5">
          <h2 className="font-medium mb-4">Specification Breakdown</h2>
          {bc.lines.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No lines yet.{" "}
              <Link to="/buyer/bulk-container/catalog" className="text-accent-900 underline">Browse catalog</Link>
            </p>
          ) : (
            <table className="w-full text-sm" data-testid="bc-spec-breakdown">
              <thead className="text-xs uppercase text-zinc-500">
                <tr>
                  <th className="text-left pb-2">Product</th>
                  <th className="text-left pb-2">Specification</th>
                  <th className="text-left pb-2">Quantity (MT)</th>
                  <th className="text-left pb-2">Indicative/MT</th>
                  {editable && <th className="pb-2"></th>}
                </tr>
              </thead>
              <tbody>
                {bc.lines.map((line) => (
                  <tr key={line.id} data-testid={`bc-line-${line.productRef}`} className="border-t border-zinc-100">
                    <td className="py-3">
                      <div className="font-medium">{line.name}</div>
                      <div className="text-xs text-zinc-500">{line.category} · {line.standardPacking}</div>
                    </td>
                    <td className="py-3 text-xs text-zinc-600 max-w-[200px]">
                      {fmtSpec(line.specValues)}
                    </td>
                    <td className="py-3">
                      {editable ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="h-7 w-7 border rounded"
                            onClick={() => void updateMt(line.id, -0.5, line.quantityMt, 1)}
                          >−</button>
                          <span data-testid={`bc-line-mt-${line.id}`}>{line.quantityMt}</span>
                          <button
                            type="button"
                            className="h-7 w-7 border rounded"
                            onClick={() => void updateMt(line.id, 0.5, line.quantityMt, 1)}
                          >+</button>
                        </div>
                      ) : (
                        line.quantityMt
                      )}
                    </td>
                    <td className="py-3 text-zinc-600">
                      {fmtMoney(line.indicativeUnitLow)} – {fmtMoney(line.indicativeUnitHigh)}
                    </td>
                    {editable && (
                      <td className="py-3">
                        <button
                          type="button"
                          className="text-red-600 text-xs"
                          onClick={() => void removeLine(line.id)}
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="dmx-card p-5 space-y-4" data-testid="bc-container-summary">
          <h2 className="font-medium">Container Summary</h2>
          <div>
            <label className="text-xs uppercase text-zinc-500">Capacity</label>
            <p className="text-sm mt-1">25 MT fixed container</p>
          </div>
          <CapacityMeter
            currentMt={bc.currentWeightMt}
            maxMt={bc.maxCapacityMt}
            fillPercent={bc.fillPercent}
            warnings={bc.capacityWarnings}
          />
          <div>
            <label className="text-xs uppercase text-zinc-500">Estimated value range</label>
            <p className="text-2xl font-display font-semibold mt-1" data-testid="bc-est-value">
              {fmtMoney(bc.estValueMin)} – {fmtMoney(bc.estValueMax)}
            </p>
            <p className="text-[10px] text-amber-700 mt-1">Estimated value only — not final pricing</p>
          </div>
        </div>
      </div>
    </div>
      ) : null}
    </QueryState>
  );
}
