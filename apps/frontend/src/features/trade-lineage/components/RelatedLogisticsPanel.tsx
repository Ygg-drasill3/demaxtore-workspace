/**
 * Sprint 31 — Related Logistics panel for PO / Shipment workspaces.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tradeLineageApi } from "../lib/trade-lineage.api";
import type { RelatedEntitiesDto } from "@dmx/contracts/trade-lineage";

type Mode = "purchase-order" | "shipment" | "container";

interface Props {
  mode: Mode;
  entityId: string;
  /** Required when mode=container */
  shipmentId?: string;
  title?: string;
}

function useRelated(mode: Mode, entityId: string, shipmentId?: string) {
  return useQuery({
    queryKey: ["trade-lineage", mode, entityId, shipmentId ?? null],
    queryFn: async (): Promise<RelatedEntitiesDto> => {
      if (mode === "purchase-order") return tradeLineageApi.forPurchaseOrder(entityId);
      if (mode === "shipment") return tradeLineageApi.forShipment(entityId);
      return tradeLineageApi.forContainer(shipmentId!, entityId);
    },
    enabled: !!entityId && (mode !== "container" || !!shipmentId),
    staleTime: 15_000,
  });
}

export function RelatedLogisticsPanel({ mode, entityId, shipmentId, title }: Props) {
  const { data, isLoading, isError } = useRelated(mode, entityId, shipmentId);
  const heading =
    title ??
    (mode === "purchase-order"
      ? "Linked shipments"
      : mode === "shipment"
        ? "Linked orders"
        : "Linked containers");

  return (
    <section data-testid="related-logistics" className="dmx-card p-4 space-y-3">
      <h2 className="font-medium">{heading}</h2>
      {isLoading && (
        <p className="text-sm text-zinc-500" data-testid="related-logistics-loading">
          Loading linked items…
        </p>
      )}
      {isError && (
        <p className="text-sm text-zinc-500" data-testid="related-logistics-error">
          Linked items unavailable.
        </p>
      )}
      {data && <RelatedBody data={data} mode={mode} />}
    </section>
  );
}

function RelatedBody({ data, mode }: { data: RelatedEntitiesDto; mode: Mode }) {
  const ctx = data.sourceContext;
  const empty =
    data.purchaseOrders.length === 0 &&
    data.shipments.length === 0 &&
    data.containers.length === 0 &&
    data.bookings.every((b) => !b.hasBooking) &&
    !(ctx?.rfqWorkspaceId || ctx?.commodityBidWorkspaceId || (ctx?.inspections?.length ?? 0) > 0);

  if (empty) {
    return (
      <p className="text-sm text-zinc-500" data-testid="related-logistics-empty">
        No linked orders or shipments yet.
      </p>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      {ctx &&
        (ctx.rfqWorkspaceId ||
          ctx.commodityBidWorkspaceId ||
          (ctx.inspections?.length ?? 0) > 0 ||
          (ctx.freightRequests?.length ?? 0) > 0) && (
          <Group label="Sourcing & quality" testId="related-source-context">
            {ctx.sourceType ? (
              <li data-testid="related-source-type">Source type: {ctx.sourceType}</li>
            ) : null}
            {ctx.rfqWorkspaceId ? (
              <li>
                <Link
                  className="text-blue-600 hover:underline"
                  data-testid="related-source-rfq"
                  to={`/workspace/rfq/${ctx.rfqWorkspaceId}`}
                >
                  {ctx.rfqExternalRef || "RFQ"}
                </Link>
              </li>
            ) : null}
            {ctx.commodityBidWorkspaceId ? (
              <li>
                <Link
                  className="text-blue-600 hover:underline"
                  data-testid="related-source-commoditybid"
                  to={`/workspace/commoditybid/${ctx.commodityBidWorkspaceId}`}
                >
                  {ctx.commodityBidExternalRef || "CommodityBid"}
                </Link>
              </li>
            ) : null}
            {(ctx.inspections ?? []).map((i) => (
              <li key={i.id} data-testid={`related-inspection-${i.id}`}>
                <span className="font-medium text-ink-900">{i.inspectionNumber}</span>
                <span className="text-zinc-500">
                  {" "}
                  · {i.status}
                  {i.decision ? ` · ${i.decision}` : ""}
                </span>
              </li>
            ))}
            {(ctx.freightRequests ?? []).map((f) => (
              <li key={f.id} data-testid={`related-freight-request-${f.id}`}>
                Freight request · {f.status}
                {f.hasSelection ? " · offer selected" : ""}
                {ctx.orderWorkspaceId ? (
                  <>
                    {" · "}
                    <Link
                      className="text-blue-600 hover:underline"
                      to={`/workspace/order/${ctx.orderWorkspaceId}#order-freightiq-section`}
                    >
                      Open freight
                    </Link>
                  </>
                ) : null}
              </li>
            ))}
          </Group>
        )}

      {mode !== "purchase-order" && data.purchaseOrders.length > 0 && (
        <Group label="Purchase Orders" testId="related-pos">
          {data.purchaseOrders.map((po) => (
            <li key={po.id}>
              <Link
                className="text-blue-600 hover:underline"
                data-testid={`related-po-${po.id}`}
                to={`/workspace/po/${po.id}`}
              >
                {po.poNumber}
              </Link>
              <span className="text-zinc-500"> · {po.status}</span>
            </li>
          ))}
        </Group>
      )}

      {data.poLines.length > 0 && (
        <Group label="PO Lines / SKUs" testId="related-po-lines">
          {data.poLines.map((l) => (
            <li key={l.id} data-testid={`related-line-${l.id}`}>
              <span className="font-medium">{l.sku || "—"}</span>
              <span className="text-zinc-600"> · {l.description}</span>
              <span className="text-zinc-500">
                {" "}
                · {l.allocatedQuantity}/{l.orderedQuantity} allocated
              </span>
            </li>
          ))}
        </Group>
      )}

      {data.bookings.some((b) => b.hasBooking) && (
        <Group label="Booking" testId="related-bookings">
          {data.bookings
            .filter((b) => b.hasBooking)
            .map((b) => (
              <li key={b.shipmentWorkspaceId} className="space-y-0.5">
                <div>
                  <Link
                    className="text-blue-600 hover:underline"
                    to={`/workspace/shipment/${b.shipmentWorkspaceId}`}
                    data-testid={`related-booking-${b.shipmentWorkspaceId}`}
                  >
                    {b.bookingReference || "Booking"}
                  </Link>
                  {b.status ? (
                    <span className="text-zinc-500" data-testid="related-booking-status">
                      {" "}
                      · {b.status}
                    </span>
                  ) : null}
                  {b.carrier ? <span className="text-zinc-500"> · {b.carrier}</span> : null}
                </div>
                {(b.vessel || b.pol || b.pod) && (
                  <div className="text-xs text-zinc-500">
                    {[b.vessel, b.voyage, b.pol && b.pod ? `${b.pol} → ${b.pod}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
              </li>
            ))}
        </Group>
      )}

      {mode !== "shipment" && data.shipments.length > 0 && (
        <Group label="Shipments" testId="related-shipments">
          {data.shipments.map((s) => (
            <li key={s.id}>
              <Link
                className="text-blue-600 hover:underline"
                data-testid={`related-shipment-${s.id}`}
                to={`/workspace/shipment/${s.id}`}
              >
                {s.externalRef || s.id.slice(0, 8)}
              </Link>
              {s.state ? <span className="text-zinc-500"> · {s.state}</span> : null}
              <span className="text-zinc-500"> · {s.containerCount} container(s)</span>
            </li>
          ))}
        </Group>
      )}

      {data.allocations.length > 0 && (
        <Group label="Line allocations" testId="related-allocations">
          {data.allocations.map((a) => (
            <li key={a.id} data-testid={`related-allocation-${a.id}`}>
              <span className="font-medium">{a.sku || "Line"}</span>
              <span className="text-zinc-600"> · qty {a.quantity}</span>
              {a.shipmentContainerId ? (
                <span className="text-zinc-500">
                  {" "}
                  · {data.containers.find((c) => c.id === a.shipmentContainerId)?.containerNumber ?? "container"}
                </span>
              ) : null}
            </li>
          ))}
        </Group>
      )}

      {data.containers.length > 0 && (
        <Group label="Containers" testId="related-containers">
          {data.containers.map((c) => (
            <li key={c.id} data-testid={`related-container-${c.id}`}>
              <Link
                className="text-blue-600 hover:underline"
                to={`/workspace/shipment/${c.shipmentWorkspaceId}`}
              >
                {c.containerNumber}
              </Link>
              {c.containerType ? <span className="text-zinc-500"> · {c.containerType}</span> : null}
              {c.status ? <span className="text-zinc-500"> · {c.status}</span> : null}
            </li>
          ))}
        </Group>
      )}
    </div>
  );
}

function Group({
  label,
  testId,
  children,
}: {
  label: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <div data-testid={testId}>
      <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-1">{label}</h3>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}
