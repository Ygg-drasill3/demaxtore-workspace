import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shipmentApi } from "../lib/shipment.api";
import { toast } from "@/store/toast.store";
import { useT } from "@/i18n/useT";
import type { ShipmentTrackingDTO } from "@dmx/contracts/shipment-tracking";

export default function ShipmentTrackingPanel({
  shipmentId,
  defaultContainer,
  bookingStatus,
  bookingEta,
  shipmentRef,
  shipmentState,
}: {
  shipmentId: string;
  defaultContainer?: string | null;
  bookingStatus?: string | null;
  bookingEta?: string | null;
  shipmentRef?: string | null;
  shipmentState?: string | null;
}) {
  const qc = useQueryClient();
  const { t } = useT();
  const [container, setContainer] = useState(defaultContainer ?? "");

  const { data: config } = useQuery({
    queryKey: ["tracking-config"],
    queryFn: () => shipmentApi.trackingConfig(),
    staleTime: 300_000,
  });

  const { data: tracking, isLoading } = useQuery({
    queryKey: ["shipment", shipmentId, "tracking"],
    queryFn: () => shipmentApi.tracking(shipmentId) as Promise<ShipmentTrackingDTO>,
  });

  const link = useMutation({
    mutationFn: () => shipmentApi.linkTracking(shipmentId, { containerNumber: container }),
    onSuccess: () => {
      toast.success("Tracking linked");
      void qc.invalidateQueries({ queryKey: ["shipment", shipmentId] });
    },
    onError: () => toast.error("Failed to link tracking"),
  });

  const sync = useMutation({
    mutationFn: () => shipmentApi.syncTracking(shipmentId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["shipment", shipmentId] }),
  });

  if (isLoading) return <div className="text-sm text-zinc-500">Loading tracking…</div>;

  const snap = tracking?.latestSnapshot;
  const delayed = snap?.delayFlag && snap.delayFlag !== "NONE";
  const isSimulated = config?.provider === "manual" || tracking?.provider === "MANUAL" || snap?.provider === "MANUAL";
  const maritimeEta = snap?.eta ?? null;

  return (
    <div data-testid="shipment-tracking-panel" className="space-y-4">
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm" data-testid="tracking-context">
        <Info label="Shipment" value={shipmentRef} testId="tracking-shipment-ref" />
        <Info label="Shipment state" value={shipmentState?.replace(/_/g, " ")} testId="tracking-shipment-state" />
        <Info label="Booking status" value={bookingStatus?.replace(/_/g, " ")} testId="tracking-booking-status" />
        <Info label="Booking ETA" value={bookingEta ? new Date(bookingEta).toLocaleString() : null} testId="tracking-booking-eta" />
        <Info label="Maritime ETA" value={maritimeEta ? new Date(maritimeEta).toLocaleString() : null} testId="tracking-maritime-eta" />
        <Info label={t("shipment.containerNumber")} value={defaultContainer || null} testId="tracking-container-context" />
      </dl>
      {isSimulated && (
        <div
          data-testid="tracking-demo-banner"
          className="text-xs p-3 rounded border border-amber-200 bg-amber-50 text-amber-900"
        >
          {t(
            "shipment.trackingDemoMode",
            "Tracking updates here are simulated in the workspace. This is not a live carrier GPS feed.",
          )}
        </div>
      )}

      {!tracking?.linked && (
        <div data-testid="tracking-link-form" className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-zinc-500">{t("shipment.containerNumber")}</label>
            <input
              data-testid="tracking-container-input"
              value={container}
              onChange={(e) => setContainer(e.target.value)}
              placeholder="e.g. MSKU1234567"
              className="h-10 w-full px-3 mt-1 rounded-lg border border-zinc-200 text-sm"
            />
          </div>
          <button
            type="button"
            data-testid="tracking-link-submit"
            disabled={link.isPending || !container.trim()}
            onClick={() => link.mutate()}
            className="h-10 px-4 rounded-lg bg-blue-900 text-white text-sm disabled:opacity-50"
          >
            {t("shipment.linkTracking")}
          </button>
        </div>
      )}

      {tracking?.linked && (
        <>
          <div className="flex items-center justify-between">
            <span data-testid="tracking-health" className="text-sm">
              {t("shipment.trackingStatus")}: <strong>{snap?.trackingStatus ?? "—"}</strong>
              {delayed && (
                <span data-testid="tracking-delay-badge" className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  {t("shipment.delay")}
                </span>
              )}
            </span>
            <button
              type="button"
              data-testid="tracking-sync-btn"
              disabled={sync.isPending}
              onClick={() => sync.mutate()}
              className="text-xs px-2 py-1 border rounded"
            >
              {t("shipment.syncTracking")}
            </button>
          </div>

          <div data-testid="tracking-overview" className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <Info label={t("shipment.carrier")} value={snap?.carrier} testId="tracking-carrier" />
            <Info label={t("shipment.vessel")} value={snap?.vesselName} testId="tracking-vessel" />
            <Info label={t("shipment.voyage")} value={snap?.voyage} testId="tracking-voyage" />
            <Info label="POL" value={snap?.pol} testId="tracking-pol" />
            <Info label="POD" value={snap?.pod} testId="tracking-pod" />
            <Info label="ETD" value={snap?.etd ? new Date(snap.etd).toLocaleString() : null} testId="tracking-etd" />
            <Info label="Maritime ETA" value={snap?.eta ? new Date(snap.eta).toLocaleString() : null} testId="tracking-eta" />
            <Info label={t("shipment.lastSync")} value={snap?.syncedAt ? new Date(snap.syncedAt).toLocaleString() : null} testId="tracking-last-sync" />
            <Info label={t("shipment.provider")} value={isSimulated ? t("shipment.providerSimulated") : (tracking.provider ?? snap?.provider)} testId="tracking-provider" />
          </div>

          <div data-testid="tracking-timeline">
            <h3 className="text-sm font-medium mb-2">{t("shipment.trackingTimeline")}</h3>
            <ul className="text-xs space-y-1 max-h-40 overflow-auto">
              {tracking.events.length === 0 && <li className="text-zinc-500">{t("shipment.noTrackingEvents")}</li>}
              {tracking.events.map((e) => (
                <li key={e.id} data-testid={`tracking-event-${e.eventType}`}>
                  {e.title} · {new Date(e.occurredAt).toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function Info({ label, value, testId }: { label: string; value: string | null | undefined; testId: string }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div data-testid={testId} className="font-medium">{value ?? "—"}</div>
    </div>
  );
}
