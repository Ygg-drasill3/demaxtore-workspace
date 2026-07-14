import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { freightEstimateApi } from "../lib/freight-estimate.api";
import type { FreightEstimatePanelDto } from "@dmx/contracts/freight-estimate";
import { REFERENCE_FREIGHT_DISCLAIMER_TR } from "@dmx/contracts/reference-freight";

function fmtMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null) return "—";
  return `${currency ?? "USD"} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function statusBadge(status: FreightEstimatePanelDto["expirationStatus"]) {
  if (status === "EXPIRING_SOON") return "bg-amber-50 text-amber-800 border-amber-200";
  if (status === "EXPIRED") return "bg-red-50 text-red-800 border-red-200";
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  return "bg-zinc-50 text-zinc-600 border-zinc-200";
}

interface Props {
  tradeId: string;
  compact?: boolean;
  showRefresh?: boolean;
}

export function EstimatedCifPanel({ tradeId, compact = false, showRefresh = true }: Props) {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const isSupplier = user?.role === "SUPPLIER";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["freight-estimate-panel", tradeId],
    queryFn: () => freightEstimateApi.panel(tradeId),
    enabled: !!tradeId,
  });

  const refresh = useMutation({
    mutationFn: () => {
      if (!data?.current?.id) {
        return freightEstimateApi.create({ tradeId });
      }
      return freightEstimateApi.refresh(data.current.id);
    },
    onSuccess: () => {
      toast.success("Reference freight estimate refreshed");
      void qc.invalidateQueries({ queryKey: ["freight-estimate-panel", tradeId] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not refresh reference freight estimate";
      toast.error(message);
    },
  });

  if (isLoading) {
    return (
      <div data-testid="estimated-cif-panel-loading" className="dmx-card p-5 animate-pulse text-sm text-zinc-500">
        Loading estimate…
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid="estimated-cif-panel-error" className="dmx-card p-5 text-sm text-red-600">
        Could not load freight estimate.
      </div>
    );
  }

  const current = data?.current;
  const expiration = data?.expirationStatus ?? "NONE";
  const referenceFreight = data?.referenceFreight;
  const referenceMissing = referenceFreight?.status === "MISSING";

  if (isSupplier) {
    return (
      <section data-testid="estimated-cif-panel" className="dmx-card overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-3 bg-zinc-50/80">
          <h2 className="text-sm font-semibold text-ink-900">Estimated CIF Visibility</h2>
        </div>
        <div className="p-5 text-sm text-zinc-600">
          <p data-testid="estimated-cif-supplier-status">
            Freight estimate status: <span className="font-medium">{expiration.replace(/_/g, " ")}</span>
          </p>
          <p className="text-xs text-zinc-400 mt-2">Reference freight and CIF values are visible to the buyer only.</p>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="estimated-cif-panel" className="dmx-card overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3 bg-zinc-50/80 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Estimated CIF Visibility</h2>
          {!compact && (
            <p className="text-xs text-zinc-500 mt-0.5">Reference rate for decision support — final freight via FreightIQ.</p>
          )}
        </div>
        <span
          data-testid="estimated-cif-expiration-status"
          className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${statusBadge(expiration)}`}
        >
          {expiration.replace(/_/g, " ")}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {referenceMissing && (
          <div
            data-testid="estimated-cif-reference-missing"
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {referenceFreight.message}
          </div>
        )}

        {!current ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600">
              {referenceMissing
                ? "Estimated CIF cannot be calculated without a monthly reference freight rate for this lane."
                : "No active reference-freight CIF estimate yet."}
            </p>
            {showRefresh && !referenceMissing && (user?.role === "BUYER" || user?.role === "ADMIN") && (
              <button
                type="button"
                data-testid="estimated-cif-generate"
                className="dmx-btn-secondary text-sm inline-flex items-center gap-2"
                disabled={refresh.isPending}
                onClick={() => void refresh.mutate()}
              >
                <RefreshCw className="h-4 w-4" />
                Generate estimate
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Stat label="FOB Price" value={fmtMoney(current.fobValue, current.currency)} testId="estimated-cif-fob" />
              <Stat
                label="Reference Freight"
                value={fmtMoney(current.estimatedFreight, current.currency)}
                testId="estimated-cif-freight"
                sublabel="Estimated Freight (Reference Rate)"
              />
              <Stat label="Estimated CIF" value={fmtMoney(current.estimatedCifValue, current.currency)} testId="estimated-cif-total" highlight />
            </div>
            <p data-testid="estimated-cif-disclaimer" className="text-xs text-zinc-500 leading-relaxed">
              {REFERENCE_FREIGHT_DISCLAIMER_TR}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-zinc-500">Estimate date</span>
                <div data-testid="estimated-cif-date" className="font-medium tabular-nums">{fmtDate(current.estimatedAt)}</div>
              </div>
              <div>
                <span className="text-zinc-500">Estimate expiration</span>
                <div data-testid="estimated-cif-expires" className="font-medium tabular-nums">{fmtDate(current.expiresAt)}</div>
              </div>
            </div>
            {referenceFreight?.validFrom && referenceFreight.validUntil && (
              <div className="text-xs text-zinc-500">
                Reference rate valid: {fmtDate(referenceFreight.validFrom)} – {fmtDate(referenceFreight.validUntil)}
              </div>
            )}
            {showRefresh && (user?.role === "BUYER" || user?.role === "ADMIN") && (
              <button
                type="button"
                data-testid="estimated-cif-refresh"
                className="dmx-btn-secondary text-sm inline-flex items-center gap-2"
                disabled={refresh.isPending}
                onClick={() => void refresh.mutate()}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh estimate
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  testId,
  highlight,
  sublabel,
}: {
  label: string;
  value: string;
  testId: string;
  highlight?: boolean;
  sublabel?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={`rounded-lg border px-3 py-2.5 ${highlight ? "border-accent-900/20 bg-accent-50/40" : "border-zinc-100 bg-white"}`}
    >
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      {sublabel && <div className="text-[9px] text-zinc-400 mt-0.5">{sublabel}</div>}
      <div className="mt-1 text-sm font-semibold text-ink-900 tabular-nums">{value}</div>
    </div>
  );
}

/** Compact summary for PO confirmation modals. */
export function EstimatedCifPoGateSummary({ tradeId }: { tradeId?: string }) {
  const { data } = useQuery({
    queryKey: ["freight-estimate-panel", tradeId],
    queryFn: () => freightEstimateApi.panel(tradeId!),
    enabled: !!tradeId,
  });
  const current = data?.current;
  const referenceMissing = data?.referenceFreight?.status === "MISSING";

  if (referenceMissing) {
    return (
      <div data-testid="issue-po-reference-missing" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        {data?.referenceFreight?.message}
      </div>
    );
  }

  if (!current) {
    return (
      <div data-testid="issue-po-estimate-missing" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        An active reference-freight CIF estimate is required before issuing a Purchase Order.
      </div>
    );
  }
  return (
    <div data-testid="issue-po-estimate-summary" className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2 text-sm">
      <div className="font-medium text-ink-900">Estimated CIF Visibility</div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><span className="text-zinc-500 block">FOB</span><span data-testid="issue-po-fob">{fmtMoney(current.fobValue, current.currency)}</span></div>
        <div><span className="text-zinc-500 block">Reference Freight</span><span data-testid="issue-po-freight">{fmtMoney(current.estimatedFreight, current.currency)}</span></div>
        <div><span className="text-zinc-500 block">CIF</span><span data-testid="issue-po-cif" className="font-semibold">{fmtMoney(current.estimatedCifValue, current.currency)}</span></div>
      </div>
      <p className="text-[10px] text-zinc-500">{REFERENCE_FREIGHT_DISCLAIMER_TR}</p>
    </div>
  );
}
