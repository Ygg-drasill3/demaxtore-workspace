import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { purchaseOrderApi } from "../lib/purchase-order.api";
import { purchaseOrderKeys } from "../lib/purchase-order.query-keys";
import { purchaseOrderRoutes } from "../lib/purchase-order.routes";
import { purchaseOrderListPath } from "../lib/purchase-order.filters";
import { PURCHASE_ORDER_SOURCE_LABELS } from "@dmx/contracts/purchase-order";
import { purchaseOrderStatusLabel } from "../lib/purchase-order.labels";
import { formatPoDateShort, formatPoMoney } from "../lib/purchase-order.formatters";
import { PurchaseOrderSourceBadge, PurchaseOrderStatusBadge } from "./PurchaseOrderBadges";
import { useAuth } from "@/store/auth.store";

const CAN_CREATE = new Set(["BUYER", "ADMIN", "SUPER_ADMIN"]);

export default function PoOverviewWidget({
  listBasePath = "/buyer/purchase-orders",
  showCreateCta = true,
}: {
  listBasePath?: string;
  showCreateCta?: boolean;
}) {
  const user = useAuth((s) => s.user);
  const canCreate = showCreateCta && user && CAN_CREATE.has(user.role);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: purchaseOrderKeys.dashboard(),
    queryFn: () => purchaseOrderApi.dashboard(),
  });

  if (isLoading) {
    return (
      <div data-testid="po-overview-widget" className="dmx-card p-4 text-sm text-zinc-500">
        Loading PO metrics…
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid="po-overview-widget" className="dmx-card p-4 text-sm text-red-700 flex justify-between gap-3">
        <span>Unable to load Purchase Order metrics.</span>
        <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  const totals = data?.totals;
  const bySource = data?.bySource;
  const recent = data?.recent ?? [];
  const operational = data?.operational;
  const valueByCurrency = data?.valueByCurrency ?? [];

  const empty = (totals?.all ?? data?.openPoCount ?? 0) === 0 && recent.length === 0;

  return (
    <div data-testid="po-overview-widget" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Purchase Orders</h2>
        {canCreate && (
          <Link
            to={purchaseOrderRoutes.create}
            className="dmx-btn-primary text-sm"
            data-testid="po-dashboard-create-cta"
          >
            Create Purchase Order
          </Link>
        )}
      </div>

      {empty ? (
        <div className="dmx-card p-6 text-center space-y-3" data-testid="po-dashboard-empty">
          <p className="font-medium">No Purchase Orders yet</p>
          <p className="text-sm text-zinc-500">
            Create your first Purchase Order directly or issue one from an RFQ.
          </p>
          {canCreate && (
            <Link to={purchaseOrderRoutes.create} className="dmx-btn-primary text-sm inline-flex">
              Create Purchase Order
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              testId="po-metric-total"
              label="Total Purchase Orders"
              value={totals?.all ?? 0}
              to={listBasePath}
            />
            <MetricCard
              testId="po-metric-active"
              label="Active Purchase Orders"
              value={operational?.active ?? data?.openPoCount ?? 0}
              to={purchaseOrderListPath(listBasePath, {})}
            />
            <MetricCard
              testId="po-metric-ack-pending"
              label="Awaiting Acknowledgement"
              value={operational?.awaitingAcknowledgement ?? data?.acknowledgementPending ?? 0}
              to={purchaseOrderListPath(listBasePath, { status: "APPROVED" })}
            />
            <MetricCard
              testId="po-metric-amendments"
              label="Amendment Requested"
              value={totals?.amendmentRequested ?? data?.amendmentsOpen ?? 0}
              to={purchaseOrderListPath(listBasePath, {})}
            />
          </div>

          {bySource && (
            <div className="dmx-card p-4" data-testid="po-source-breakdown">
              <h3 className="text-sm font-medium mb-3">By source</h3>
              <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                {(Object.keys(PURCHASE_ORDER_SOURCE_LABELS) as Array<keyof typeof PURCHASE_ORDER_SOURCE_LABELS>).map(
                  (source) => (
                    <li key={source}>
                      <Link
                        to={purchaseOrderListPath(listBasePath, { source })}
                        className="block rounded-lg border border-paper-200 px-3 py-2 hover:bg-paper-50"
                        data-testid={`po-source-link-${source}`}
                      >
                        <span className="text-xs text-zinc-500 block">
                          {PURCHASE_ORDER_SOURCE_LABELS[source]}
                        </span>
                        <span className="text-lg font-semibold tabular-nums">{bySource[source] ?? 0}</span>
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}

          {valueByCurrency.length > 0 && (
            <div className="dmx-card p-4 text-sm" data-testid="po-value-by-currency">
              <h3 className="font-medium mb-2">Open value by currency</h3>
              <ul className="space-y-1">
                {valueByCurrency.map((v) => (
                  <li key={v.currency} className="flex justify-between gap-3">
                    <span className="text-zinc-500">{v.currency}</span>
                    <span className="tabular-nums">{formatPoMoney(v.openTotal, v.currency, "tr-TR")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recent.length > 0 && (
            <div className="dmx-card p-4" data-testid="po-recent-list">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Recent Purchase Orders</h3>
                <Link to={listBasePath} className="text-xs text-blue-600 hover:underline">View all</Link>
              </div>
              <ul className="divide-y divide-zinc-100">
                {recent.map((po) => (
                  <li key={po.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2" data-testid={`po-recent-${po.id}`}>
                    <div className="min-w-0">
                      <Link
                        to={purchaseOrderRoutes.detail(po.id)}
                        className="font-medium text-blue-900 hover:underline break-words"
                      >
                        {po.poNumber}
                      </Link>
                      <p className="text-xs text-zinc-500 truncate">{po.supplier.companyName}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <PurchaseOrderSourceBadge source={po.source} />
                      <PurchaseOrderStatusBadge status={po.status} />
                      <span className="text-xs text-zinc-500">
                        {formatPoDateShort(po.issuedAt ?? po.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  to,
  testId,
}: {
  label: string;
  value: number;
  to: string;
  testId: string;
}) {
  return (
    <Link
      to={to}
      data-testid={testId}
      className="dmx-card p-4 hover:bg-paper-50 transition-colors block"
    >
      <span className="text-zinc-500 text-xs">{label}</span>
      <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
      <span className="sr-only">{purchaseOrderStatusLabel("ISSUED")}</span>
    </Link>
  );
}
