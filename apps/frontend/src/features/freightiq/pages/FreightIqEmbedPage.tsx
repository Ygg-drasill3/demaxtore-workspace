import { Link, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Route, Ship } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/i18n/useT";
import { QueryState } from "@/components/ui/QueryState";
import { useAuth } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { cn } from "@/lib/utils";
import { formatWorkspaceRef } from "@/lib/workspace-ref";
import type { FreightPortfolioItem } from "@dmx/contracts/freightiq";
import { freightiqApi } from "../lib/freightiq.api";
import { FreightOfferListCard, type OfferHighlight } from "../components/FreightOfferListCard";
import { FreightSelectConfirmModal } from "../components/FreightSelectConfirmModal";
import FreightOpsPage from "./FreightOpsPage";

/**
 * FreightIQ hub — only freight requests that already have offers.
 * Numbered list → click to expand → select offer to continue.
 */
export default function FreightIqEmbedPage() {
  const location = useLocation();
  const roleSegment = location.pathname.split("/")[1]?.toLowerCase() ?? "buyer";

  if (roleSegment === "admin") {
    return <FreightOpsPage />;
  }

  return (
    <div
      className="h-full w-full flex flex-col"
      data-testid="freightiq-embed-page"
      data-guide="freightiq-hub"
    >
      <div className="shrink-0 border-b border-paper-200 bg-white px-4 py-3 flex items-start gap-3">
        <span className="h-9 w-9 rounded-xl bg-accent-900 text-white grid place-items-center shrink-0">
          <Route className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-lg font-semibold tracking-tight text-ink-900">
            Freight offers
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
            Only routes with forwarder offers. Open one, compare, and select.
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto" data-guide="freightiq-hub-panel">
        <AccountFreightOfferHub />
      </div>
    </div>
  );
}

function highlightFor(
  offerId: string,
  hints: FreightPortfolioItem["comparisonHints"],
): OfferHighlight {
  if (hints.lowestPriceOfferId === offerId) return "best_price";
  if (hints.fastestTransitOfferId === offerId) return "fastest";
  if (hints.earliestEtdOfferId === offerId) return "earliest_etd";
  if (hints.closestCutOffOfferId === offerId) return "cutoff_soon";
  return null;
}

function statusLabel(item: FreightPortfolioItem): string {
  if (item.execution?.state) return item.execution.state.replace(/_/g, " ");
  if (item.selection) return "Offer selected";
  if (item.request.status === "CONVERTED_TO_SHIPMENT") return "Booking in progress";
  if (item.request.status === "QUOTED") return "Offers ready";
  return item.request.status.replace(/_/g, " ");
}

function AccountFreightOfferHub() {
  const { t } = useT();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const canSelect = user?.role === "BUYER";
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ orderId: string; offerId: string } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["freightiq", "my-portfolio"],
    queryFn: () => freightiqApi.myPortfolio(),
  });

  const items = useMemo(
    () => (data?.items ?? []).filter((i) => i.offers.length > 0),
    [data?.items],
  );
  const itemIdsKey = items.map((i) => i.orderId).join(",");

  useEffect(() => {
    if (!items.length) {
      setOpenOrderId(null);
      return;
    }
    setOpenOrderId((prev) => {
      if (prev && items.some((i) => i.orderId === prev)) return prev;
      return items.length === 1 ? items[0].orderId : null;
    });
  }, [itemIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps -- sync open row to portfolio ids only

  const select = useMutation({
    mutationFn: ({ orderId, offerId }: { orderId: string; offerId: string }) =>
      freightiqApi.action(orderId, "select-offer", { offerId }),
    onSuccess: (_res, vars) => {
      toast.success(t("order.freightiq.offerSelected", "Freight offer selected"));
      setPending(null);
      setOpenOrderId(vars.orderId);
      void qc.invalidateQueries({ queryKey: ["freightiq", "my-portfolio"] });
      void qc.invalidateQueries({ queryKey: ["freightiq", vars.orderId] });
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
          ?.message ?? "Could not select offer";
      toast.error(msg);
    },
  });

  const pendingItem = pending ? items.find((i) => i.orderId === pending.orderId) : null;
  const pendingOffer = pendingItem?.offers.find((o) => o.id === pending?.offerId);

  return (
    <QueryState
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      errorMessage={t("freightiq.embed.ssoFailed", "Could not load freight offers.")}
    >
      <div className="max-w-3xl mx-auto p-4 space-y-3" data-testid="freightiq-native-hub">
        {!items.length ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
            No freight offers yet. When a forwarder quotes your route, it will appear here.
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-500 px-0.5">
              {items.length} quoted route{items.length === 1 ? "" : "s"}
            </p>
            <ol className="space-y-2" data-testid="freightiq-quoted-list">
              {items.map((item, index) => {
                const open = openOrderId === item.orderId;
                const offers = [...item.offers].sort((a, b) => a.price - b.price);
                const selectedId = item.selection?.offerId ?? null;
                const lowest = offers[0];
                const ref = formatWorkspaceRef(item.orderRef);

                return (
                  <li
                    key={item.orderId}
                    className={cn(
                      "rounded-xl border bg-white overflow-hidden transition-shadow",
                      open ? "border-accent-900/30 shadow-sm" : "border-zinc-200",
                    )}
                    data-testid={`freightiq-hub-order-${item.orderId}`}
                    data-order-ref={item.orderRef}
                  >
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-50/80"
                      aria-expanded={open}
                      onClick={() => setOpenOrderId(open ? null : item.orderId)}
                      data-testid={`freightiq-hub-toggle-${item.orderId}`}
                    >
                      <span className="h-8 w-8 rounded-lg bg-ink-900 text-white text-sm font-semibold grid place-items-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="h-8 w-8 rounded-lg bg-sky-50 text-sky-800 grid place-items-center shrink-0">
                        <Ship className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate" title={ref.full}>
                          {ref.label}
                          {ref.detail ? (
                            <span className="font-normal text-zinc-500"> · {ref.detail}</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5 truncate">
                          {item.request.pol} → {item.request.pod}
                          {" · "}
                          {offers.length} offer{offers.length === 1 ? "" : "s"}
                          {lowest
                            ? ` · from ${lowest.price.toLocaleString()} ${lowest.currency}`
                            : ""}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0",
                          selectedId
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-amber-50 text-amber-800",
                        )}
                      >
                        {statusLabel(item)}
                      </span>
                      {open ? (
                        <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                      )}
                    </button>

                    {open && (
                      <div className="border-t border-zinc-100 px-4 py-4 space-y-4 bg-paper-50/40">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-zinc-500">
                            Compare offers below
                            {canSelect && !selectedId ? ", then select one to continue." : "."}
                          </p>
                          <Link
                            to={`/workspace/order/${item.orderId}#order-freightiq-section`}
                            className="text-xs font-medium text-accent-900 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Order workspace →
                          </Link>
                        </div>

                        <div className="space-y-3">
                          {offers.map((o) => (
                            <FreightOfferListCard
                              key={o.id}
                              offer={o}
                              pol={item.request.pol}
                              pod={item.request.pod}
                              highlight={highlightFor(o.id, item.comparisonHints)}
                              selected={selectedId === o.id}
                              canSelect={canSelect && !selectedId}
                              onRequestSelect={(offerId) =>
                                setPending({ orderId: item.orderId, offerId })
                              }
                              busy={select.isPending}
                            />
                          ))}
                        </div>

                        {selectedId && (
                          <p className="text-xs text-emerald-700">
                            Offer selected. Continue in the order workspace for booking steps.
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>

      {pending && pendingOffer && (
        <FreightSelectConfirmModal
          offer={pendingOffer}
          busy={select.isPending}
          onCancel={() => setPending(null)}
          onConfirm={() => select.mutate(pending)}
        />
      )}
    </QueryState>
  );
}
