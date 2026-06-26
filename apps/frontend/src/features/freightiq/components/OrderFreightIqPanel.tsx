import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { freightiqApi } from "../lib/freightiq.api";
import { orderApi } from "@/features/order/lib/order.api";
import { isFreightIntakeEligible } from "@dmx/contracts/freightiq";
import { FREIGHTIQ_SCRIPTS, freightPhase, freightiqScriptFor, freightMilestones } from "@dmx/contracts/freightiq.scripts";
import { useAuth } from "@/store/auth.store";
import { useT } from "@/i18n/useT";
import { toast } from "@/store/toast.store";
import { Ship } from "lucide-react";
import { WorkspaceWhatHappensNextCard } from "@/features/workspace/components/WorkspaceWhatHappensNextCard";
import { WorkspaceProgressBar } from "@/features/workspace/components/WorkspaceProgressBar";
import { WorkspaceTimeline, FREIGHT_EVENT_LABELS, FREIGHT_STORY_EVENTS } from "@/features/workspace/components/WorkspaceTimeline";
import { FreightIqHero } from "./FreightIqHero";
import { ForwarderActivityStrip } from "./ForwarderActivityStrip";
import { FreightCommercialCard } from "./FreightCommercialCard";
import { FreightCreateWizard, type FreightCreateForm } from "./FreightCreateWizard";
import { FreightAwaitingOffers } from "./FreightAwaitingOffers";
import { FreightOfferList } from "./FreightOfferList";
import { FreightSelectedWinnerCard } from "./FreightSelectedWinnerCard";
import { FreightSelectConfirmModal } from "./FreightSelectConfirmModal";
import { OrderFreightChatPanel } from "@/features/chat/components/OrderFreightChatPanel";

interface OrderPorts {
  originPort?: string;
  destinationPort?: string;
  contractRef?: string;
  state?: string;
  externalRef?: string;
}

interface Props {
  orderId: string;
  order: OrderPorts;
  spawnedShipments?: Array<{ id: string; externalRef: string; state: string }>;
  fullscreenPath: string;
}

export function OrderFreightIqPanel({ orderId, order, spawnedShipments = [], fullscreenPath }: Props) {
  const { t } = useT();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["freightiq", orderId],
    queryFn: () => freightiqApi.summary(orderId),
  });

  const { data: timeline } = useQuery({
    queryKey: ["order", orderId, "timeline"],
    queryFn: () => orderApi.timeline(orderId) as Promise<Array<{ id: string; eventType: string; createdAt: string }>>,
  });

  const eligible = order.state
    ? isFreightIntakeEligible(order.state, (user?.role === "SUPPLIER" ? "SUPPLIER" : user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" ? "ADMIN" : "BUYER"))
    : false;
  const canCreate = user?.role === "BUYER";
  const canSelect = user?.role === "BUYER";
  const request = summary?.request ?? null;
  const offers = summary?.offers ?? [];
  const communications = summary?.communications ?? [];

  const activeOffers = offers.filter((o) => o.status === "ACTIVE" || o.status === "REVISED");
  const phase = freightPhase(eligible, request?.status ?? null);
  const hasSelectableOffers = activeOffers.length > 0 && !summary?.selection;
  const effectivePhase = hasSelectableOffers && (phase === "REQUESTED" || phase === "QUOTING") ? "QUOTED" : phase;
  const script = hasSelectableOffers && !summary?.selection
    ? FREIGHTIQ_SCRIPTS.QUOTED
    : freightiqScriptFor(phase, (user?.role ?? "BUYER") as "BUYER" | "SUPPLIER" | "ADMIN");
  const milestones = freightMilestones(effectivePhase);

  const lowest = summary?.comparisonHints.lowestPriceOfferId
    ? offers.find((o) => o.id === summary.comparisonHints.lowestPriceOfferId)
    : null;
  const fastest = summary?.comparisonHints.fastestTransitOfferId
    ? offers.find((o) => o.id === summary.comparisonHints.fastestTransitOfferId)
    : null;
  const selected = summary?.selection
    ? offers.find((o) => o.id === summary.selection!.offerId)
    : null;

  const scriptVars = {
    pol: request?.pol ?? order.originPort ?? "—",
    pod: request?.pod ?? order.destinationPort ?? "—",
    mode: request?.mode?.replace(/_/g, " ") ?? "Ocean FCL",
    originPort: order.originPort ?? "—",
    destinationPort: order.destinationPort ?? "—",
    contactedCount: String(communications.length),
    respondedCount: String(communications.filter((c) => c.status === "RESPONDED" || c.status === "CLOSED").length),
    offerCount: String(offers.filter((o) => o.status === "ACTIVE" || o.status === "REVISED").length),
    lowestPrice: lowest ? `${lowest.price.toLocaleString()} ${lowest.currency}` : "—",
    fastestTransit: fastest ? String(fastest.transitDays) : "—",
    selectedCarrier: selected?.carrierName ?? "—",
    selectedPrice: selected ? `${selected.price.toLocaleString()} ${selected.currency}` : "—",
    selectedTransit: selected ? String(selected.transitDays) : "—",
    shipmentRef: spawnedShipments[0]?.externalRef ?? "—",
    shipmentUrl: summary?.selection?.shipmentWorkspaceId
      ? `/workspace/shipment/${summary.selection.shipmentWorkspaceId}`
      : spawnedShipments[0] ? `/workspace/shipment/${spawnedShipments[0].id}` : "#",
  };

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["freightiq", orderId] });
    void qc.invalidateQueries({ queryKey: ["order", orderId] });
  };

  const handleCreate = async (form: FreightCreateForm) => {
    setBusy(true);
    try {
      await freightiqApi.action(orderId, "create-request", {
        mode: form.mode,
        pol: form.pol.trim(),
        pod: form.pod.trim(),
        cargoDescription: form.cargoDescription.trim(),
        containerType: form.containerType.trim() || undefined,
        readyDate: form.readyDate ? new Date(form.readyDate).toISOString() : undefined,
      });
      toast.success(t("order.freightiq.requestCreated"));
      setWizardOpen(false);
      refresh();
      requestAnimationFrame(() => {
        document.getElementById("freightiq-selection")?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? err.response?.data?.message ?? t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const handleSelect = async (offerId: string) => {
    setBusy(true);
    try {
      await freightiqApi.action(orderId, "select-offer", { offerId });
      toast.success(t("order.freightiq.offerSelected"));
      refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const initialForm: FreightCreateForm = {
    mode: "OCEAN_FCL",
    pol: order.originPort ?? "",
    pod: order.destinationPort ?? "",
    cargoDescription: order.contractRef ? `Cargo for ${order.contractRef}` : "General cargo",
    containerType: "40HC",
    readyDate: "",
  };

  const pol = request?.pol ?? order.originPort ?? "—";
  const pod = request?.pod ?? order.destinationPort ?? "—";

  return (
    <div data-testid="order-freightiq-section" className="space-y-4">
      <section className="dmx-card p-0 overflow-hidden">
        <FreightIqHero pol={pol} pod={pod} summary={summary} orderRef={order.externalRef} />

        <div className="px-4 py-3 border-b border-paper-200 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-zinc-500">
            {spawnedShipments.length > 0
              ? t("order.freightiq.shipmentCount").replace("{count}", String(spawnedShipments.length))
              : t("order.freightiq.noShipments")}
          </div>
          <div className="flex gap-2">
            {canCreate && !request && eligible && !wizardOpen && (
              <button type="button" data-testid="order-freightiq-create-quote" className="dmx-btn-primary text-sm" onClick={() => setWizardOpen(true)}>
                {t("order.freightQuote.create")}
              </button>
            )}
            <Link className="text-sm text-accent-900 hover:underline self-center" to={fullscreenPath}>
              {t("freightiq.embed.openFullscreen")}
            </Link>
          </div>
        </div>

        {wizardOpen && !request && (
          <FreightCreateWizard initial={initialForm} onSubmit={(f) => void handleCreate(f)} onCancel={() => setWizardOpen(false)} busy={busy} />
        )}
      </section>

      <WorkspaceProgressBar milestones={milestones} label="Freight progress" testId="freightiq-progress-bar" compact />

      <WorkspaceWhatHappensNextCard
        testId="freightiq-what-happens-next"
        script={script}
        vars={scriptVars}
        stateKey={phase}
        primaryLabel={script.primaryLabel}
        loading={busy}
        onPrimaryClick={
          script.primaryAction === "create_freight_request"
            ? () => setWizardOpen(true)
            : script.primaryAction === "select_freight_offer"
              ? () => document.getElementById("freightiq-selection")?.scrollIntoView({ behavior: "smooth" })
              : undefined
        }
        onFallbackClick={
          script.fallbackPrimary?.href
            ? () => {
                const href = script.fallbackPrimary!.href!.replace("{{shipmentUrl}}", String(scriptVars.shipmentUrl));
                if (href.startsWith("#")) {
                  document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
                } else if (href.startsWith("/")) {
                  window.location.href = href;
                }
              }
            : undefined
        }
      />

      <ForwarderActivityStrip communications={communications} />

      <FreightCommercialCard commercial={summary?.commercialSummary} />

      {isLoading ? (
        <div className="dmx-card p-6 text-sm text-zinc-500">{t("common.loading")}</div>
      ) : !request && !wizardOpen ? (
        <div data-testid="order-freightiq-empty" className="dmx-card flex flex-col items-center justify-center py-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-paper-100 text-zinc-400 grid place-items-center mb-4">
            <Ship className="h-7 w-7" />
          </div>
          <p className="font-display text-lg font-semibold">{t("order.freightiq.emptyTitle")}</p>
          <p className="text-sm text-zinc-500 mt-2 max-w-md">{t("order.freightiq.emptyHint")}</p>
          {!eligible && (
            <p data-testid="order-freightiq-not-eligible" className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mt-4">
              {t("order.freightiq.notEligible")}
            </p>
          )}
        </div>
      ) : summary ? (
        <div id="freightiq-selection" className="space-y-4">
          {selected && (
            <FreightSelectedWinnerCard
              offer={selected}
              shipmentUrl={scriptVars.shipmentUrl}
              estimatedCif={
                summary.commercialSummary?.estimatedCifUsd != null
                  ? `${summary.commercialSummary.estimatedCifUsd.toLocaleString()} USD`
                  : null
              }
            />
          )}

          {selected ? null : activeOffers.length === 0 ? (
            <FreightAwaitingOffers
              contactedCount={communications.length}
              respondedCount={communications.filter((c) => c.status === "RESPONDED" || c.status === "CLOSED").length}
            />
          ) : (
            <FreightOfferList
              summary={summary}
              pol={pol}
              pod={pod}
              canSelect={canSelect}
              onRequestSelect={(id) => setPendingOfferId(id)}
              busy={busy}
            />
          )}
        </div>
      ) : null}

      <FreightSelectConfirmModal
        offer={pendingOfferId ? offers.find((o) => o.id === pendingOfferId) ?? null : null}
        summary={summary}
        busy={busy}
        onCancel={() => setPendingOfferId(null)}
        onConfirm={() => {
          if (pendingOfferId) void handleSelect(pendingOfferId).finally(() => setPendingOfferId(null));
        }}
      />

      {spawnedShipments.length > 0 && (
        <ul data-testid="order-spawned-shipments" className="dmx-card px-4 py-3 text-xs flex flex-wrap gap-x-4 gap-y-1">
          {spawnedShipments.map((s) => (
            <li key={s.id}>
              <Link data-testid={`order-shipment-link-${s.id}`} className="text-accent-900 hover:underline font-medium" to={`/workspace/shipment/${s.id}`}>
                {s.externalRef} · {s.state}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {timeline && timeline.length > 0 && (
        <WorkspaceTimeline
          testId="freightiq-timeline"
          title="Freight activity"
          events={timeline.map((e, i) => ({ id: e.id ?? String(i), eventType: e.eventType, createdAt: e.createdAt }))}
          eventLabels={FREIGHT_EVENT_LABELS}
          storyEventTypes={FREIGHT_STORY_EVENTS}
          filterPrefix="freight."
        />
      )}

      <OrderFreightChatPanel orderWorkspaceId={orderId} orderRef={order.externalRef} />
    </div>
  );
}
