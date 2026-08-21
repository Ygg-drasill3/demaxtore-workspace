/**
 * Sprint 36A — compact International continuation / progress (presentation only).
 * Derived from PO + related lineage; no separate workflow state store.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tradeLineageApi } from "@/features/trade-lineage/lib/trade-lineage.api";
import { purchaseOrderRoutes } from "@/features/purchase-order/lib/purchase-order.routes";
import type { RelatedEntitiesDto } from "@dmx/contracts/trade-lineage";
import type { PurchaseOrderSource } from "@dmx/contracts/purchase-order";

type StepKey =
  | "SOURCING"
  | "ORDER"
  | "INSPECTION"
  | "FREIGHT"
  | "BOOKING"
  | "SHIPMENT"
  | "DELIVERY";

const STEP_LABEL: Record<StepKey, string> = {
  SOURCING: "Sourcing",
  ORDER: "Order",
  INSPECTION: "Inspection",
  FREIGHT: "Freight",
  BOOKING: "Booking",
  SHIPMENT: "Shipment",
  DELIVERY: "Delivery",
};

type StepState = "done" | "active" | "pending" | "skipped";

interface Props {
  purchaseOrderId: string;
  orderId: string | null | undefined;
  source: PurchaseOrderSource;
  rfqWorkspaceId?: string | null;
  commodityBidWorkspaceId?: string | null;
  /** When true, hide Request Inspection CTA (already on inspection page). */
  hideInspectionCta?: boolean;
}

function deriveSteps(data: RelatedEntitiesDto | undefined, source: PurchaseOrderSource): Array<{
  key: StepKey;
  state: StepState;
}> {
  const ctx = data?.sourceContext;
  const hasSource =
    source === "RFQ" ||
    source === "COMMODITY_BID" ||
    !!ctx?.rfqWorkspaceId ||
    !!ctx?.commodityBidWorkspaceId;
  const inspections = ctx?.inspections ?? [];
  const hasInspection = inspections.length > 0;
  const inspectionPassed = inspections.some(
    (i) =>
      String(i.decision ?? "").toUpperCase().includes("PASS") ||
      String(i.status ?? "").toUpperCase() === "APPROVED",
  );
  const freightReqs = ctx?.freightRequests ?? [];
  const hasFreight = freightReqs.length > 0;
  const offerSelected = freightReqs.some((f) => f.hasSelection);
  const hasBooking = (data?.bookings ?? []).some((b) => b.hasBooking);
  const hasShipment = (data?.shipments ?? []).length > 0;
  const delivered = (data?.shipments ?? []).some((s) =>
    ["DELIVERED", "COMPLETED", "CLOSED"].includes(String(s.state ?? "").toUpperCase()),
  );
  const inTransit = (data?.shipments ?? []).some((s) =>
    ["IN_TRANSIT", "DEPARTED", "ON_WATER"].includes(String(s.state ?? "").toUpperCase()),
  );

  const steps: Array<{ key: StepKey; state: StepState }> = [
    {
      key: "SOURCING",
      state: source === "DIRECT" ? "skipped" : hasSource ? "done" : "pending",
    },
    { key: "ORDER", state: "done" },
    {
      key: "INSPECTION",
      state: !hasInspection ? "pending" : inspectionPassed || hasFreight || hasShipment ? "done" : "active",
    },
    {
      key: "FREIGHT",
      state: offerSelected || hasBooking || hasShipment ? "done" : hasFreight ? "active" : "pending",
    },
    {
      key: "BOOKING",
      state: hasBooking || hasShipment ? "done" : offerSelected ? "active" : "pending",
    },
    {
      key: "SHIPMENT",
      state: delivered ? "done" : hasShipment ? (inTransit ? "active" : "active") : "pending",
    },
    { key: "DELIVERY", state: delivered ? "done" : "pending" },
  ];

  // Mark first pending (non-skipped) as active when nothing further is active
  if (!steps.some((s) => s.state === "active")) {
    const idx = steps.findIndex((s) => s.state === "pending");
    if (idx >= 0) steps[idx]!.state = "active";
  }

  return steps;
}

function mark(state: StepState): string {
  if (state === "done") return "✓";
  if (state === "active") return "●";
  if (state === "skipped") return "—";
  return "○";
}

export function InternationalExecutionBridgePanel({
  purchaseOrderId,
  orderId,
  source,
  rfqWorkspaceId,
  commodityBidWorkspaceId,
  hideInspectionCta,
}: Props) {
  const { data } = useQuery({
    queryKey: ["trade-lineage", "purchase-order", purchaseOrderId],
    queryFn: () => tradeLineageApi.forPurchaseOrder(purchaseOrderId),
    enabled: !!purchaseOrderId,
    staleTime: 15_000,
  });

  const steps = deriveSteps(data, source);
  const ctx = data?.sourceContext;
  const freightHref = orderId
    ? `${purchaseOrderRoutes.orderWorkspace(orderId)}#order-freightiq-section`
    : null;
  const hasFreightStarted = (ctx?.freightRequests?.length ?? 0) > 0;
  const inspectionPassed = (ctx?.inspections ?? []).some(
    (i) =>
      String(i.decision ?? "").toUpperCase().includes("PASS") ||
      String(i.status ?? "").toUpperCase() === "APPROVED",
  );

  return (
    <section
      data-testid="international-execution-bridge"
      className="dmx-card p-4 space-y-3"
      aria-label="International execution progress"
    >
      <h2 className="font-medium">Transaction progress</h2>
      <ol
        className="flex flex-wrap gap-x-3 gap-y-1 text-xs uppercase tracking-wide text-zinc-600"
        data-testid="intl-progress-steps"
      >
        {steps.map((s) => (
          <li
            key={s.key}
            data-testid={`intl-step-${s.key}`}
            data-state={s.state}
            className={
              s.state === "done"
                ? "text-emerald-700"
                : s.state === "active"
                  ? "text-accent-900 font-semibold"
                  : s.state === "skipped"
                    ? "text-zinc-400"
                    : "text-zinc-500"
            }
          >
            <span aria-hidden>{mark(s.state)}</span> {STEP_LABEL[s.key]}
          </li>
        ))}
      </ol>

      <div className="text-sm space-y-1 text-zinc-700" data-testid="intl-source-summary">
        {(rfqWorkspaceId || ctx?.rfqWorkspaceId) && (
          <p>
            Source RFQ:{" "}
            <Link
              className="text-blue-600 hover:underline"
              to={purchaseOrderRoutes.rfqWorkspace(rfqWorkspaceId ?? ctx!.rfqWorkspaceId!)}
            >
              {ctx?.rfqExternalRef ?? "View RFQ"}
            </Link>
          </p>
        )}
        {(commodityBidWorkspaceId || ctx?.commodityBidWorkspaceId) && (
          <p>
            Source CommodityBid:{" "}
            <Link
              className="text-blue-600 hover:underline"
              to={purchaseOrderRoutes.commodityBidWorkspace(
                commodityBidWorkspaceId ?? ctx!.commodityBidWorkspaceId!,
              )}
            >
              {ctx?.commodityBidExternalRef ?? "View CommodityBid"}
            </Link>
          </p>
        )}
        {source === "DIRECT" && (
          <p data-testid="intl-direct-source">Source: direct purchase (no RFQ / CommodityBid required)</p>
        )}
        {(ctx?.inspections?.length ?? 0) > 0 && (
          <p>
            Inspection:{" "}
            {ctx!.inspections.map((i, idx) => (
              <span key={i.id}>
                {idx > 0 ? ", " : null}
                <span className="font-medium text-ink-900">{i.inspectionNumber}</span>
                <span className="text-zinc-500">
                  {" "}
                  ({i.status}
                  {i.decision ? ` · ${i.decision}` : ""})
                </span>
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 pt-1" data-testid="intl-continuation-actions">
        {freightHref && (
          <Link
            data-testid="intl-request-freight"
            className="inline-flex items-center rounded-lg bg-accent-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-600"
            to={freightHref}
          >
            {hasFreightStarted ? "Open freight" : "Request freight"}
          </Link>
        )}
        {!hideInspectionCta && orderId && !inspectionPassed && (ctx?.inspections?.length ?? 0) === 0 && (
          <Link
            data-testid="intl-open-order-inspection"
            className="inline-flex items-center rounded-lg border border-paper-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-900 hover:bg-paper-50"
            to={purchaseOrderRoutes.orderWorkspace(orderId)}
          >
            Request Inspection
          </Link>
        )}
        {orderId && (
          <Link
            data-testid="intl-open-order"
            className="text-sm text-blue-600 hover:underline self-center"
            to={purchaseOrderRoutes.orderWorkspace(orderId)}
          >
            Open order
          </Link>
        )}
      </div>
    </section>
  );
}
