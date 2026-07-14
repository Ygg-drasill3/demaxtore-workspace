import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { rfqApi } from "../lib/rfq.api";
import { toast } from "@/store/toast.store";
import { Gavel, FileText, AlertCircle } from "lucide-react";
import CommodityBidEmbedPage from "@/features/commoditybid/pages/CommodityBidEmbedPage";
import { QueryState } from "@/components/ui/QueryState";
import { useT } from "@/i18n/useT";
import {
  assessRfqCommodityBidEligibility,
  commodityBidEligibleProductLabels,
} from "@dmx/contracts/commoditybid-rfq-eligibility";

type StrategyChoice = "DIRECT_RFQ" | "COMMODITYBID_AUCTION" | null;

export default function ProcurementStrategyPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [choice, setChoice] = useState<StrategyChoice>(null);
  const [submitting, setSubmitting] = useState(false);

  const { t } = useT();
  const { data: rfq, isLoading, isError, refetch } = useQuery({
    queryKey: ["rfq", id],
    queryFn: () => rfqApi.get(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!rfq) return;
    if (rfq.procurementMethod === "DIRECT_RFQ") {
      nav(`/workspace/rfq/${id}`, { replace: true });
    } else if (rfq.procurementMethod === "COMMODITYBID_AUCTION" && rfq.linkedCommoditybidId) {
      nav(`/workspace/commoditybid/${rfq.linkedCommoditybidId}`, { replace: true });
    }
  }, [rfq, id, nav]);

  const selectDirect = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      const dto = await rfqApi.selectProcurementStrategy(id, { procurementMethod: "DIRECT_RFQ" });
      qc.setQueryData(["rfq", id], dto);
      toast.success("Direct RFQ selected");
      nav(`/workspace/rfq/${id}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? "Failed to select strategy");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError || (!isLoading && !rfq)}
      onRetry={() => void refetch()}
      errorMessage={t("rfq.workspace.error")}
    >
      {rfq ? (
        <ProcurementStrategyContent
          rfq={rfq}
          choice={choice}
          setChoice={setChoice}
          submitting={submitting}
          selectDirect={selectDirect}
        />
      ) : null}
    </QueryState>
  );
}

function ProcurementStrategyContent({
  rfq,
  choice,
  setChoice,
  submitting,
  selectDirect,
}: {
  rfq: NonNullable<Awaited<ReturnType<typeof rfqApi.get>>>;
  choice: StrategyChoice;
  setChoice: (c: StrategyChoice) => void;
  submitting: boolean;
  selectDirect: () => Promise<void>;
}) {
  const { t, locale } = useT();
  const allowedProducts = commodityBidEligibleProductLabels(locale === "tr" ? "tr" : "en").join(", ");
  const eligibility = useMemo(
    () => assessRfqCommodityBidEligibility({
      productCategory: rfq.productCategory,
      lineItems: rfq.lineItems.map((li) => ({ description: li.description })),
    }),
    [rfq.productCategory, rfq.lineItems],
  );

  const trySelectCommodityBid = () => {
    if (!eligibility.eligible) return;
    setChoice("COMMODITYBID_AUCTION");
  };

  return (
    <div
      data-testid="procurement-strategy-page"
      className={`mx-auto w-full space-y-6 animate-fade-in ${
        choice === "COMMODITYBID_AUCTION" ? "max-w-6xl" : "max-w-3xl"
      }`}
    >
      <header>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">Buyer · Procurement Strategy</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Choose Procurement Strategy</h1>
        <p className="text-sm text-zinc-600 mt-2">
          RFQ <span className="font-medium">{rfq.externalRef}</span> — {rfq.title}. Select how you want to execute sourcing.
        </p>
      </header>

      {!choice && (
        <div className="space-y-4">
          {eligibility.eligible ? (
            <p
              data-testid="procurement-cb-eligible-hint"
              className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3"
            >
              {t("rfq.procurement.cbEligible.hint", undefined, { products: allowedProducts })}
            </p>
          ) : (
            <div
              data-testid="procurement-cb-ineligible-banner"
              className="flex gap-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3"
              role="alert"
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{t("rfq.procurement.cbNotEligible.title")}</p>
                <p className="mt-1">{t("rfq.procurement.cbNotEligible.body", undefined, { products: allowedProducts })}</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            data-testid="procurement-direct-rfq"
            onClick={() => setChoice("DIRECT_RFQ")}
            className="dmx-card dmx-card-hover p-6 text-left space-y-3"
          >
            <FileText className="h-6 w-6 text-accent-900" />
            <h2 className="font-display text-xl font-semibold">Direct RFQ</h2>
            <p className="text-sm text-zinc-600">
              Request quotations directly from suppliers. Suitable for repeat purchases and relationship sourcing.
            </p>
          </button>
          <button
            type="button"
            data-testid="procurement-commoditybid-auction"
            onClick={trySelectCommodityBid}
            disabled={!eligibility.eligible}
            aria-disabled={!eligibility.eligible}
            className={`dmx-card p-6 text-left space-y-3 ${
              eligibility.eligible
                ? "dmx-card-hover"
                : "opacity-60 cursor-not-allowed border-dashed border-amber-200 bg-amber-50/40"
            }`}
          >
            <Gavel className={`h-6 w-6 ${eligibility.eligible ? "text-accent-900" : "text-zinc-400"}`} />
            <h2 className="font-display text-xl font-semibold">CommodityBid Auction</h2>
            <p className="text-sm text-zinc-600">
              {eligibility.eligible
                ? t("rfq.procurement.cbCard.enabled")
                : t("rfq.procurement.cbCard.disabled")}
            </p>
          </button>
        </div>
        </div>
      )}

      {choice === "DIRECT_RFQ" && (
        <section className="dmx-card p-6 space-y-4">
          <h2 className="font-medium">Confirm Direct RFQ</h2>
          <p className="text-sm text-zinc-600">
            Suppliers will submit quotations. You review offers and issue a PO when ready.
          </p>
          <div className="flex gap-3">
            <button type="button" className="dmx-btn-secondary" onClick={() => setChoice(null)}>Back</button>
            <button
              type="button"
              data-testid="procurement-direct-confirm"
              disabled={submitting}
              className="dmx-btn-primary"
              onClick={() => void selectDirect()}
            >
              Continue with Direct RFQ
            </button>
          </div>
        </section>
      )}

      {choice === "COMMODITYBID_AUCTION" && (
        <section className="space-y-4" data-testid="procurement-cb-embed-section">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <button type="button" className="dmx-btn-secondary" onClick={() => setChoice(null)}>Back</button>
            <p className="text-sm text-zinc-600 text-center sm:text-left">
              CommodityBid production request — form loaded from CommodityBid panel.
            </p>
          </div>
          <CommodityBidEmbedPage createMode centered />
        </section>
      )}
    </div>
  );
}
