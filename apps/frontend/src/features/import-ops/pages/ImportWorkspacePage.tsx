import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Ship, FileCheck, ShieldCheck, Truck, Receipt, Route as RouteIcon } from "lucide-react";
import { useT } from "@/i18n/useT";
import { shipmentApi } from "@/features/shipment/lib/shipment.api";
import { customsApi } from "@/features/customs/lib/customs.api";
import { inlandApi } from "@/features/inland/lib/inland.api";
import { toCustomerStage, customerStatusLabel, CUSTOMER_IMPORT_STAGES } from "@dmx/contracts/turkey-import-stage";
import ShipmentTrackingPanel from "@/features/shipment/components/ShipmentTrackingPanel";
import TradeDocumentsTab from "@/features/trade-documents/components/TradeDocumentsTab";
import { ShipmentJourneyMap } from "@/features/shipment/components/ShipmentJourneyMap";
import { ShipmentBookingPanel } from "@/features/shipment/components/ShipmentBookingPanel";
import { ShipmentContainersPanel } from "@/features/shipment/components/ShipmentContainersPanel";
import { TurkeyCustomsPanel } from "@/features/customs/components/TurkeyCustomsPanel";
import { InlandDeliveryPanel } from "@/features/inland/components/InlandDeliveryPanel";
import { LandedCostPanel } from "@/features/landed-cost/components/LandedCostPanel";
import type { ShipmentState } from "@dmx/contracts/shipment.fsm";

/**
 * Turkey Importer — customer-facing Import Workspace (spec §11 "One Workspace").
 * NON-DESTRUCTIVE: composes existing shared panels behind tabs. It does NOT
 * reimplement domain logic and never touches the shared ShipmentWorkspacePage
 * used by Broker / Trucker / Ops execution.
 */
type TabId = "journey" | "shipment" | "documents" | "customs" | "delivery" | "costs";

const TABS: { id: TabId; label: string; icon: typeof Ship; testId: string }[] = [
  { id: "journey",   label: "Journey",   icon: RouteIcon,   testId: "import-tab-journey" },
  { id: "shipment",  label: "Shipment",  icon: Ship,        testId: "import-tab-shipment" },
  { id: "documents", label: "Documents", icon: FileCheck,   testId: "import-tab-documents" },
  { id: "customs",   label: "Customs",   icon: ShieldCheck, testId: "import-tab-customs" },
  { id: "delivery",  label: "Delivery",  icon: Truck,       testId: "import-tab-delivery" },
  { id: "costs",     label: "Costs",     icon: Receipt,     testId: "import-tab-costs" },
];

export default function ImportWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useT();
  const [tab, setTab] = useState<TabId>("journey");

  const { data: shipment, isLoading } = useQuery({
    queryKey: ["shipment", id],
    queryFn: () => shipmentApi.get(id!),
    enabled: !!id,
  });
  const { data: timeline } = useQuery({
    queryKey: ["shipment", id, "timeline"],
    queryFn: () => shipmentApi.timeline(id!),
    enabled: !!id,
  });
  const { data: customsCase } = useQuery({
    queryKey: ["customs", "by-shipment", id],
    queryFn: () => customsApi.byShipment(id!),
    enabled: !!id,
  });
  const { data: inlandDelivery } = useQuery({
    queryKey: ["inland", "by-shipment", id],
    queryFn: () => inlandApi.byShipment(id!),
    enabled: !!id,
  });

  if (isLoading || !shipment) {
    return <div data-testid="import-workspace-loading">{t("common.loading", "Loading…")}</div>;
  }

  const eta = (shipment as { currentEta?: string }).currentEta ?? shipment.eta ?? null;
  const stageInput = {
    shipmentState: shipment.state,
    customsStatus: (customsCase as { status?: string } | null)?.status,
    inlandStatus: (inlandDelivery as { status?: string } | null)?.status,
    hasOpenException: shipment.hasOpenException,
  };
  const stage = toCustomerStage(stageInput);
  const statusLabel = customerStatusLabel(stageInput);

  // Smart "Next action" → the most relevant tab (no dead ends, spec §37).
  const nextTab: TabId =
    stage.actionRequired ? "journey"
    : stage.stage === "Customs" ? "customs"
    : stage.stage === "Delivery" ? "delivery"
    : stage.stage === "Completed" ? "costs"
    : "shipment";

  return (
    <div data-testid="import-workspace" data-import-stage={stage.stage} className="max-w-5xl mx-auto space-y-6 p-4 animate-fade-in">
      <div>
        <Link to="/buyer/imports" className="text-xs text-zinc-500 hover:text-ink-900 hover:underline">
          ← {t("s43.import.backImports", "My imports")}
        </Link>
      </div>

      {/* SUMMARY — always visible */}
      <section data-testid="import-summary" className="dmx-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs uppercase tracking-wide text-zinc-500">{t("s43.import.reference", "Reference")}: {shipment.externalRef}</span>
            <h1 className="font-display text-2xl font-semibold tracking-tight mt-1 flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-accent-900" />
              {t("s43.import.title", "Import")} {shipment.orderRef}
            </h1>
            <p className="text-sm text-zinc-600 mt-1" data-testid="import-route">
              {shipment.originPort} → {shipment.destinationPort}
              {(shipment as { carrierName?: string }).carrierName ? ` · ${(shipment as { carrierName?: string }).carrierName}` : ""}
            </p>
            {shipment.spawnedFrom && (
              <Link to={`/workspace/order/${shipment.spawnedFrom.id}`} className="text-xs text-accent-900 hover:underline mt-1 inline-block">
                {t("s43.import.poContext", "Purchase order")}: {shipment.spawnedFrom.externalRef}
              </Link>
            )}
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            <span
              data-testid="import-status"
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                stage.actionRequired ? "bg-red-50 text-red-700" : "bg-paper-100 text-ink-800"
              }`}
            >
              {statusLabel}
            </span>
            <span className="text-xs text-zinc-500">
              {t("s43.import.eta", "ETA")}: {eta ? new Date(eta).toLocaleDateString() : "—"}
            </span>
            <button
              type="button"
              data-testid="import-next-action"
              onClick={() => setTab(nextTab)}
              className="dmx-btn-primary text-sm"
            >
              {t("s43.import.continue", "Continue")}
            </button>
          </div>
        </div>

        {/* compact stage progress */}
        <ol className="flex flex-wrap items-center gap-1.5 text-[11px]" data-testid="import-stage-progress">
          {CUSTOMER_IMPORT_STAGES.map((label, i) => {
            const done = i < stage.index;
            const current = i === stage.index;
            return (
              <li key={label} className="flex items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 font-medium ${
                  current ? "bg-accent-900 text-white" : done ? "bg-emerald-50 text-emerald-700" : "bg-paper-100 text-zinc-500"
                }`}>{label}</span>
                {i < CUSTOMER_IMPORT_STAGES.length - 1 && <span className="text-zinc-300">→</span>}
              </li>
            );
          })}
        </ol>
      </section>

      {/* TABS */}
      <nav data-testid="import-tabs" className="flex flex-wrap gap-1 border-b border-paper-200">
        {TABS.map(({ id: tid, label, icon: Icon, testId }) => (
          <button
            key={tid}
            type="button"
            data-testid={testId}
            aria-selected={tab === tid}
            onClick={() => setTab(tid)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === tid ? "border-accent-900 text-ink-900" : "border-transparent text-zinc-500 hover:text-ink-800"
            }`}
          >
            <Icon className="h-4 w-4" />
            {t(`s43.import.tab.${tid}`, label)}
          </button>
        ))}
      </nav>

      {/* TAB PANELS */}
      <div data-testid={`import-panel-${tab}`} className="space-y-5">
        {tab === "journey" && (
          <>
            <ShipmentJourneyMap
              state={shipment.state as ShipmentState}
              eta={eta ?? undefined}
              isDelayed={shipment.hasOpenException || shipment.state === "EXCEPTION"}
            />
            {(shipment.exceptions?.length ?? 0) > 0 && (
              <section className="dmx-card p-4" data-testid="import-attention">
                <h2 className="font-medium mb-2 text-sm">{t("s43.import.attention", "Attention required")}</h2>
                <ul className="text-sm space-y-1">
                  {shipment.exceptions?.map((e: { id: string; category: string; status: string; reason: string }) => (
                    <li key={e.id} data-testid={`import-exception-${e.id}`} className="text-red-700">
                      {e.category.replace(/_/g, " ")} · {e.reason}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="dmx-card p-4" data-testid="import-timeline">
              <h2 className="font-medium mb-3 text-sm">{t("s43.import.journey", "Import journey")}</h2>
              <ul className="text-xs space-y-1.5 max-h-72 overflow-auto">
                {(timeline as Array<{ eventType: string; createdAt: string }> | undefined)?.map((e, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-ink-800">{t(e.eventType, e.eventType.replace(/[._]/g, " "))}</span>
                    <span className="text-zinc-400 shrink-0">{new Date(e.createdAt).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-GB")}</span>
                  </li>
                ))}
                {!(timeline as unknown[] | undefined)?.length && (
                  <li className="text-zinc-500">{t("s43.import.noEvents", "No journey events yet.")}</li>
                )}
              </ul>
            </section>
          </>
        )}

        {tab === "shipment" && id && (
          <>
            <ShipmentBookingPanel
              shipmentId={id}
              booking={
                shipment.booking ?? {
                  bookingReference: shipment.bookingRef ?? null,
                  bookingDate: shipment.bookingDate ?? null,
                  carrier: shipment.carrierName ?? null,
                  forwarder: shipment.forwarderName ?? null,
                  vesselOrFlight: shipment.vesselName ?? null,
                  voyage: shipment.voyageNumber ?? null,
                  portOfLoading: shipment.originPort,
                  portOfDischarge: shipment.destinationPort,
                  etd: shipment.etd ?? null,
                  eta: shipment.eta ?? null,
                  confirmedAt: shipment.bookingConfirmedAt ?? null,
                  hasBooking: !!(shipment.bookingRef || shipment.carrierName),
                  status: null,
                  source: null,
                  requestedAt: null,
                  cancelledAt: null,
                  cancelReason: null,
                  carrierBookingNumber: null,
                  cargoReadyDate: null,
                  siCutoff: null,
                  vgmCutoff: null,
                  cyCutoff: null,
                  documentCutoff: null,
                  freightRequestId: null,
                  freightOfferId: null,
                }
              }
              transportMode={(shipment.transportMode as "SEA" | "AIR" | "ROAD" | "RAIL") ?? "SEA"}
              canEdit={!!shipment.permissions?.canEditBooking}
            />
            <ShipmentContainersPanel
              shipmentId={id}
              containers={shipment.containers ?? []}
              canManage={!!shipment.permissions?.canManageContainers}
            />
            <section className="dmx-card p-4">
              <h2 className="font-medium mb-3 text-sm">{t("shipment.tracking", "Tracking")}</h2>
              <ShipmentTrackingPanel
                shipmentId={id}
                defaultContainer={
                  shipment.containers?.[0]?.containerNumber
                  ?? (shipment as { containerNumber?: string | null }).containerNumber
                }
                bookingStatus={shipment.booking?.status ?? null}
                bookingEta={shipment.booking?.eta ?? shipment.eta ?? null}
                shipmentRef={shipment.externalRef}
                shipmentState={shipment.state}
              />
            </section>
          </>
        )}

        {tab === "documents" && id && (
          <section className="dmx-card p-4" data-testid="import-documents">
            <h2 className="font-medium mb-3 text-sm">{t("s43.import.tab.documents", "Documents")}</h2>
            <TradeDocumentsTab workspaceType="SHIPMENT" workspaceId={id} />
          </section>
        )}

        {tab === "customs" && id && <TurkeyCustomsPanel shipmentWorkspaceId={id} />}
        {tab === "delivery" && id && <InlandDeliveryPanel shipmentWorkspaceId={id} />}
        {tab === "costs" && id && <LandedCostPanel shipmentWorkspaceId={id} />}
      </div>
    </div>
  );
}
