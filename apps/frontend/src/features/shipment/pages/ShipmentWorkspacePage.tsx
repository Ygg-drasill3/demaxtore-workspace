import { useCallback, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { shipmentApi } from "../lib/shipment.api";
import { useAuth } from "@/store/auth.store";
import { computeShipmentNextActions } from "@dmx/contracts/shipment.next-actions";
import type { ShipmentState, ActorRole, ShipmentAction } from "@dmx/contracts/shipment.fsm";
import { toast } from "@/store/toast.store";
import ShipmentTrackingPanel from "../components/ShipmentTrackingPanel";
import TradeDocumentsTab from "@/features/trade-documents/components/TradeDocumentsTab";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { useWorkspaceSocket } from "@/lib/socket";
import ConversationHubPanel from "@/features/conversation-hub/components/ConversationHubPanel";
import { focusTradeDocuments } from "@/features/workspace-communication/lib/focus-communication";
import { useWorkspaceFocus } from "@/features/workspace/lib/useWorkspaceFocus";
import { useT } from "@/i18n/useT";
import { shipmentScriptFor } from "@dmx/contracts/shipment.scripts";
import { toWorkspaceScriptRole } from "@dmx/contracts/workspace-scripts";
import { WorkspaceWhatHappensNextCard } from "@/features/workspace/components/WorkspaceWhatHappensNextCard";
import { WorkspaceProgressBar } from "@/features/workspace/components/WorkspaceProgressBar";
import { shipmentMilestones } from "@dmx/contracts/shipment.scripts";
import { ShipmentJourneyMap } from "../components/ShipmentJourneyMap";
import { ShipmentActionDrawer } from "../components/ShipmentActionDrawer";
import {
  WorkspaceActionModal,
  shipmentActionNeedsModal,
  type ActionModalState,
} from "@/features/workspace/components/WorkspaceActionModal";

const ACTION_PATH: Partial<Record<ShipmentAction, string>> = {
  confirm_booking: "confirm-booking",
  assign_container: "assign-container",
  pickup_cargo: "pickup-cargo",
  arrive_origin_port: "arrive-origin-port",
  load_vessel: "load-vessel",
  depart_vessel: "depart-vessel",
  arrive_destination: "arrive-destination",
  start_customs: "start-customs",
  complete_customs: "complete-customs",
  ready_delivery: "ready-delivery",
  confirm_partial_delivery: "confirm-partial-delivery",
  confirm_delivery: "confirm-delivery",
  reject_shipment: "reject-shipment",
  complete_shipment: "complete-shipment",
  report_exception: "report-exception",
  resolve_exception: "resolve-exception",
  cancel_shipment: "cancel-shipment",
};

export default function ShipmentWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const { t, locale } = useT();
  const [pendingAction, setPendingAction] = useState<ActionModalState | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const { data: documents } = useQuery({
    queryKey: ["shipment", id, "documents"],
    queryFn: () => shipmentApi.documents(id!),
    enabled: !!id,
  });

  const refreshShipment = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["shipment", id] });
  }, [qc, id]);

  useWorkspaceSocket(id, {
    "shipment.updated": refreshShipment,
    "shipment.timeline.appended": refreshShipment,
    "shipment.state.changed": refreshShipment,
    "shipment.exception.created": refreshShipment,
    "shipment.exception.resolved": refreshShipment,
    [SocketEvents.SHIPMENT_TRACKING_UPDATED]: refreshShipment,
    [SocketEvents.DOCUMENT_UPLOADED]: refreshShipment,
    [SocketEvents.COMPLIANCE_UPDATED]: refreshShipment,
    [SocketEvents.SHIPMENT_TRACKING_DELAY]: refreshShipment,
    [SocketEvents.SHIPMENT_TRACKING_ARRIVED]: refreshShipment,
  });

  const modalOpen = !!pendingAction;

  useWorkspaceFocus({
    documentsTestId: "shipment-documents-section",
  });

  if (isLoading || !shipment || !user) {
    return <div data-testid="shipment-loading">{t("common.loading")}</div>;
  }

  const isOwner = shipment.ownerUserId === user.id;
  const isCounterparty = shipment.participants?.some?.(
    (p: { userId: string; participantRole: string }) =>
      p.userId === user.id && p.participantRole === "COUNTERPARTY",
  );

  const shipState = shipment.state as ShipmentState;
  const actorRole = user.role as ActorRole;

  const actions = computeShipmentNextActions({
    state: shipState,
    actorRole,
    isOwner,
    isCounterparty: !!isCounterparty,
    hasOpenException: shipment.hasOpenException,
  });

  const shipScript = shipmentScriptFor(shipState, toWorkspaceScriptRole(actorRole) ?? "BUYER");
  const scriptVars = {
    externalRef: shipment.externalRef,
    originPort: shipment.originPort ?? "—",
    destinationPort: shipment.destinationPort ?? "—",
    carrierName: (shipment as { carrierName?: string }).carrierName ?? "—",
    vesselName: (shipment as { vesselName?: string }).vesselName ?? "—",
    eta: (shipment as { currentEta?: string }).currentEta
      ? new Date((shipment as { currentEta: string }).currentEta).toLocaleDateString()
      : "—",
    progressPercent: String(Math.round(
      shipState === "EXCEPTION" ? 50 : shipState === "IN_TRANSIT" ? 60 : 30,
    )),
    exceptionType: shipment.exceptions?.[0]?.category ?? "Delay",
    delayDays: "—",
    arrivedAt: "—",
    deliveredAt: "—",
  };
  const primaryAction = shipScript?.primaryAction
    ? actions.find((a) => a.action === shipScript.primaryAction)
    : null;
  const secondaryCount = actions.filter((a) => a.action !== shipScript?.primaryAction).length;

  const submitAction = async (
    action: ShipmentAction,
    body: { payload: Record<string, unknown>; reason?: string },
  ) => {
    const path = ACTION_PATH[action];
    if (!path) {
      toast.info(`Action ${action} not wired`);
      return;
    }
    setActionBusy(true);
    try {
      await shipmentApi.action(id!, path, body);
      toast.success(t("common.done"));
      qc.invalidateQueries({ queryKey: ["shipment", id] });
      setPendingAction(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? t("common.error"));
    } finally {
      setActionBusy(false);
    }
  };

  const runAction = (action: ShipmentAction) => {
    if (action === "upload_document") {
      focusTradeDocuments("shipment-documents-section");
      return;
    }
    const meta = actions.find((a) => a.action === action);
    if (shipmentActionNeedsModal(action)) {
      setPendingAction({
        action,
        label: meta?.label ?? action,
        variant: meta?.variant,
        requiresReason: meta?.requiresReason,
      });
      return;
    }
    void submitAction(action, { payload: {} });
  };

  return (
    <div data-testid="shipment-workspace" className="max-w-5xl mx-auto space-y-6 p-4">
      <header data-testid="shipment-header" className="space-y-1">
        <span className="text-xs uppercase text-zinc-500">{shipment.externalRef}</span>
        <h1 className="text-3xl font-semibold">{t("shipment.title")} {shipment.orderRef}</h1>
        <p data-testid="shipment-state" data-state={shipment.state} className="text-sm text-zinc-600">
          {t("shipment.state")}: {t(`shipment.state.${shipment.state}`, shipment.state)}
        </p>
        <div className="flex gap-4 text-sm text-zinc-600">
          <span data-testid="shipment-route">{shipment.originPort} → {shipment.destinationPort}</span>
          <span data-testid="shipment-contract">{t("shipment.contract")}: {shipment.contractRef}</span>
        </div>
        {shipment.spawnedFrom && (
          <Link
            data-testid="shipment-order-link"
            className="text-sm text-blue-600"
            to={`/workspace/order/${shipment.spawnedFrom.id}`}
          >
            {t("shipment.order")}: {shipment.spawnedFrom.externalRef}
          </Link>
        )}
      </header>

      <WorkspaceProgressBar milestones={shipmentMilestones(shipState)} label="Shipment progress" testId="shipment-progress-bar" />

      <WorkspaceWhatHappensNextCard
        testId="shipment-what-happens-next"
        script={shipScript}
        vars={scriptVars}
        stateKey={shipState}
        primaryLabel={shipScript?.primaryLabel ?? primaryAction?.label}
        loading={actionBusy}
        onPrimaryClick={primaryAction ? () => runAction(primaryAction.action) : undefined}
      />

      {secondaryCount > 0 && (
        <div className="flex justify-end">
          <button type="button" data-testid="shipment-more-actions" className="text-sm font-medium text-accent-900 hover:underline" onClick={() => setDrawerOpen(true)}>
            More actions ({secondaryCount})
          </button>
        </div>
      )}

      <ShipmentActionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        state={shipState}
        actorRole={actorRole}
        isOwner={isOwner}
        isCounterparty={!!isCounterparty}
        hasOpenException={shipment.hasOpenException}
        onRunAction={runAction}
      />

      {shipment.spawnedFrom && (
        <p data-testid="shipment-freightiq-handoff" className="text-sm text-zinc-600 dmx-card px-4 py-3">
          Booked via FreightIQ ·{" "}
          <Link className="text-accent-900 hover:underline font-medium" to={`/workspace/order/${shipment.spawnedFrom.id}#order-freightiq-section`}>
            View freight selection on order {shipment.spawnedFrom.externalRef}
          </Link>
        </p>
      )}

      <ShipmentJourneyMap
        state={shipState}
        eta={(shipment as { currentEta?: string }).currentEta}
        isDelayed={shipment.hasOpenException || shipState === "EXCEPTION"}
      />

      <ConversationHubPanel workspaceType="SHIPMENT" workspaceId={id!} testId="shipment-communication" />

      <section data-testid="shipment-tracking-section" className="dmx-card p-4">
        <h2 className="font-medium mb-3">{t("shipment.tracking")}</h2>
        <ShipmentTrackingPanel
          shipmentId={id!}
          defaultContainer={(shipment as { containerNumber?: string | null }).containerNumber}
        />
      </section>

      <section data-testid="shipment-documents-section" className="dmx-card p-4">
        <h2 className="font-medium mb-3">{t("shipment.tradeDocs")}</h2>
        <TradeDocumentsTab workspaceType="SHIPMENT" workspaceId={id!} />
        {!!(documents as unknown[])?.length && (
          <ul data-testid="shipment-legacy-documents" className="text-xs mt-4 text-zinc-500 space-y-1">
            {(documents as Array<{ documentType: string; fileName: string; version: number }>).map((d, i) => (
              <li key={i}>{t("shipment.legacyDoc")} {d.documentType} v{d.version}</li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="shipment-exceptions-section" className="dmx-card p-4">
        <h2 className="font-medium">{t("shipment.exceptions")}</h2>
        <ul data-testid="shipment-exceptions" className="text-sm mt-2 space-y-1">
          {shipment.exceptions?.map((e: { id: string; category: string; status: string; reason: string }) => (
            <li key={e.id} data-testid={`shipment-exception-${e.id}`}>
              {e.category} · {e.status}: {e.reason}
            </li>
          ))}
          {!shipment.exceptions?.length && <li className="text-zinc-500">{t("shipment.noExceptions")}</li>}
        </ul>
      </section>

      <section data-testid="shipment-timeline-section" className="dmx-card p-4">
        <h2 className="font-medium">{t("shipment.timeline")}</h2>
        <ul data-testid="shipment-timeline" className="text-xs mt-2 space-y-1 max-h-48 overflow-auto">
          {(timeline as Array<{ eventType: string; createdAt: string }> | undefined)?.map((e, i) => (
            <li key={i}>{e.eventType} · {new Date(e.createdAt).toLocaleString(locale === "tr" ? "tr-TR" : "en-GB")}</li>
          ))}
        </ul>
      </section>

      <section data-testid="shipment-participants-section" className="dmx-card p-4">
        <h2 className="font-medium">{t("shipment.participants")}</h2>
        <ul className="text-sm mt-2">
          {shipment.participants?.map((p: { userId: string; participantRole: string; displayName: string }) => (
            <li key={p.userId}>{p.participantRole}: {p.displayName}</li>
          ))}
        </ul>
      </section>

      <WorkspaceActionModal
        open={modalOpen}
        state={pendingAction}
        workspaceKind="shipment"
        workspaceId={id!}
        onClose={() => setPendingAction(null)}
        onConfirm={(body) => void submitAction(pendingAction!.action as ShipmentAction, body)}
        isPending={actionBusy}
      />
    </div>
  );
}
