import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Route, Plus } from "lucide-react";
import { useT } from "@/i18n/useT";
import { orderApi } from "@/features/order/lib/order.api";
import { isFreightIntakeEligible } from "@dmx/contracts/freightiq";
import { freightiqApi } from "@/features/freightiq/lib/freightiq.api";

/** Sprint 43 — buyer-initiated freight quote without admin/API/UUID. */
export default function FreightQuoteRequestPage() {
  const { t } = useT();

  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders", "freight-quote-eligible"],
    queryFn: () => orderApi.list({ bucket: "active", limit: 30 }),
  });

  const items = (orders?.items ?? []) as Array<{
    id: string;
    externalRef: string;
    state: string;
    poReference: string | null;
    supplierName: string;
    originPort?: string | null;
    destinationPort?: string | null;
  }>;

  return (
    <div
      data-testid="freight-quote-request-page"
      className="max-w-[960px] mx-auto space-y-6 animate-fade-in pb-10"
    >
      <header>
        <Link to="/buyer/imports/new" className="text-xs text-zinc-500 hover:text-ink-900 hover:underline">
          ← {t("s43.freight.backStart", "Start import")}
        </Link>
        <div className="flex items-start gap-3 mt-2">
          <span className="h-10 w-10 rounded-xl bg-accent-900 text-white grid place-items-center shrink-0">
            <Route className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {t("s43.freight.requestTitle", "Request a freight quote")}
            </h1>
            <p className="text-sm text-zinc-600 mt-1 max-w-2xl">
              {t(
                "s43.freight.requestSubtitle",
                "Select an active import order. DeMaxtore Operations will coordinate forwarders and publish offers in Freight.",
              )}
            </p>
          </div>
        </div>
      </header>

      {isLoading && (
        <p className="text-sm text-zinc-500" data-testid="freight-quote-loading">
          {t("common.loading", "Loading…")}
        </p>
      )}

      {isError && (
        <div className="dmx-card p-4 text-sm text-red-700 flex justify-between gap-3">
          <span>{t("s43.freight.loadError", "Could not load orders.")}</span>
          <button type="button" className="underline" onClick={() => void refetch()}>
            {t("common.retry", "Retry")}
          </button>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="dmx-card p-8 text-center space-y-4" data-testid="freight-quote-empty">
          <p className="text-sm text-zinc-600">
            {t(
              "s43.freight.noOrders",
              "No active import orders yet. Start with a purchase order, then return here to request freight.",
            )}
          </p>
          <Link
            to="/buyer/purchase-orders/create"
            data-testid="freight-quote-create-po"
            className="dmx-btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("s43.freight.createPo", "Create Purchase Order")}
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-3" data-testid="freight-quote-order-list">
          {items.map((o) => (
            <OrderFreightRow key={o.id} order={o} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderFreightRow({
  order,
}: {
  order: {
    id: string;
    externalRef: string;
    state: string;
    poReference: string | null;
    supplierName: string;
    originPort?: string | null;
    destinationPort?: string | null;
  };
}) {
  const { t } = useT();
  const eligible = isFreightIntakeEligible(order.state, "BUYER");

  const { data: summary } = useQuery({
    queryKey: ["freightiq", order.id],
    queryFn: () => freightiqApi.summary(order.id),
    enabled: eligible,
  });

  const hasRequest = !!summary?.request;
  const route =
    order.originPort && order.destinationPort
      ? `${order.originPort} → ${order.destinationPort}`
      : "—";

  return (
    <li
      className="dmx-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      data-testid={`freight-quote-order-${order.id}`}
    >
      <div className="min-w-0">
        <p className="font-medium text-ink-900">
          {order.poReference ?? order.externalRef}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {order.supplierName} · {route} · {order.state.replace(/_/g, " ")}
        </p>
        {hasRequest && (
          <p className="text-xs text-emerald-700 mt-1" data-testid={`freight-quote-has-request-${order.id}`}>
            {t("s43.freight.requestExists", "Freight request active — view offers")}
          </p>
        )}
        {!eligible && (
          <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-2 py-1 mt-2 inline-block">
            {t("s43.freight.notEligible", "This order cannot accept a new freight quote.")}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {eligible && (
          <Link
            to={`/workspace/order/${order.id}#order-freightiq-section`}
            data-testid={`freight-quote-open-${order.id}`}
            className="dmx-btn-primary text-sm"
          >
            {hasRequest
              ? t("s43.freight.viewOffers", "View offers")
              : t("s43.freight.requestQuote", "Request quote")}
          </Link>
        )}
        <Link
          to={`/workspace/order/${order.id}`}
          className="dmx-btn-secondary text-sm"
        >
          {t("s43.freight.openOrder", "Open order")}
        </Link>
      </div>
    </li>
  );
}
