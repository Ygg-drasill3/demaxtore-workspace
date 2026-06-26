import { lazy, Suspense, useCallback, useState } from "react";
import { OrderFreightIqPanel } from "@/features/freightiq/components/OrderFreightIqPanel";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "../lib/order.api";
import { useAuth } from "@/store/auth.store";
import { computeOrderNextActions } from "@dmx/contracts/order.next-actions";
import { isFreightOfferSelected } from "@dmx/contracts/order.freight-coordination";
import type { OrderState, ActorRole, OrderAction } from "@dmx/contracts/order.fsm";
import { api } from "@/lib/api";
import { freightiqApi } from "@/features/freightiq/lib/freightiq.api";
import { toast } from "@/store/toast.store";
import PoSummaryPanel from "@/features/purchase-order/components/PoSummaryPanel";
import WorkspaceCommunicationPanel from "@/features/workspace-communication/components/WorkspaceCommunicationPanel";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { useWorkspaceSocket } from "@/lib/socket";
import { focusWorkspaceCommunication, focusTradeDocuments } from "@/features/workspace-communication/lib/focus-communication";
import { useWorkspaceFocus } from "@/features/workspace/lib/useWorkspaceFocus";
import { useT } from "@/i18n/useT";
import { orderScriptFor, orderMilestones } from "@dmx/contracts/order.scripts";
import { toWorkspaceScriptRole } from "@dmx/contracts/workspace-scripts";
import { WorkspaceWhatHappensNextCard } from "@/features/workspace/components/WorkspaceWhatHappensNextCard";
import { WorkspaceProgressBar } from "@/features/workspace/components/WorkspaceProgressBar";
import { WorkspaceTimeline, ORDER_EVENT_LABELS } from "@/features/workspace/components/WorkspaceTimeline";
import { OrderActionDrawer } from "../components/OrderActionDrawer";
import { OrderStatusCards } from "../components/OrderStatusCards";
import NotFoundPage from "@/features/system/NotFoundPage";
import {
  WorkspaceActionModal,
  orderActionNeedsModal,
  type ActionModalState,
} from "@/features/workspace/components/WorkspaceActionModal";

const TradeDocumentsTab = lazy(() => import("@/features/trade-documents/components/TradeDocumentsTab"));

const ACTION_PATH: Partial<Record<OrderAction, string>> = {
  supplier_confirm_order: "supplier-confirm-order",
  start_production: "start-production",
  report_production_progress: "report-production-progress",
  mark_production_completed: "mark-production-completed",
  request_inspection: "request-inspection",
  skip_inspection: "skip-inspection",
  record_inspection_result: "record-inspection-result",
  proceed_to_freight: "proceed-to-freight",
  book_shipment: "book-shipment",
  mark_departed: "mark-departed",
  update_eta: "update-eta",
  mark_arrived: "mark-arrived",
  mark_partially_delivered: "mark-partially-delivered",
  mark_delivered: "mark-delivered",
  reject_order: "reject-order",
  close_order: "close-order",
  open_dispute: "open-dispute",
  resolve_dispute_close: "resolve-dispute-close",
  resolve_dispute_cancel: "resolve-dispute-cancel",
  cancel_order: "cancel-order",
  upload_document: "upload-document",
};

const FOCUS_COMMUNICATION_ACTIONS: ReadonlySet<OrderAction> = new Set(["post_clarification"]);
const FOCUS_DOCUMENTS_ACTIONS: ReadonlySet<OrderAction> = new Set(["upload_document"]);

export default function OrderWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const { t } = useT();
  const freightiqPath =
    user?.role === "ADMIN" ? "/admin/freightiq"
    : user?.role === "SUPPLIER" ? "/supplier/freightiq"
    : "/buyer/freightiq";
  const freightiqFullscreenPath = id ? `${freightiqPath}?orderId=${id}` : freightiqPath;
  const [pendingAction, setPendingAction] = useState<ActionModalState | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: order, isLoading, isError, isFetched } = useQuery({
    queryKey: ["order", id],
    queryFn: () => orderApi.get(id!),
    enabled: !!id,
    retry: false,
  });

  const { data: timeline } = useQuery({
    queryKey: ["order", id, "timeline"],
    queryFn: () => orderApi.timeline(id!),
    enabled: !!id,
  });

  const { data: statusUpdates } = useQuery({
    queryKey: ["order", id, "status-updates"],
    queryFn: () => orderApi.statusUpdates(id!),
    enabled: !!id,
  });

  const { data: spawnedShipments } = useQuery({
    queryKey: ["order", id, "spawned-shipments"],
    queryFn: () => orderApi.spawnedShipments(id!),
    enabled: !!id,
  });

  const { data: freightSummary } = useQuery({
    queryKey: ["freightiq", id],
    queryFn: () => freightiqApi.summary(id!),
    enabled: !!id,
  });

  // Must stay above the early return below — hooks cannot be called conditionally
  // or the hook count diverges between the loading and loaded renders (C8).
  const { data: orchConfig } = useQuery({
    queryKey: ["orchestration-config"],
    queryFn: () =>
      api
        .get<{ hideOrderLogisticsActions: boolean }>("/orchestration/config")
        .then((r) => r.data)
        .catch(() => ({ hideOrderLogisticsActions: false })),
    staleTime: 60_000,
  });

  const refreshOrder = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["order", id] });
    qc.invalidateQueries({ queryKey: ["freightiq", id] });
  }, [qc, id]);

  useWorkspaceSocket(id, {
    "order.updated": refreshOrder,
    "order.timeline.appended": refreshOrder,
    "order.state.changed": refreshOrder,
    [SocketEvents.FREIGHT_REQUEST_CREATED]: refreshOrder,
    [SocketEvents.FREIGHT_OFFER_SUBMITTED]: refreshOrder,
    [SocketEvents.FREIGHT_OFFER_SELECTED]: refreshOrder,
    [SocketEvents.FREIGHT_COMMUNICATION_SENT]: refreshOrder,
    [SocketEvents.FREIGHT_OFFER_INTAKE_CREATED]: refreshOrder,
    [SocketEvents.DOCUMENT_UPLOADED]: refreshOrder,
    [SocketEvents.COMPLIANCE_UPDATED]: refreshOrder,
  });

  const modalOpen = !!pendingAction;

  useWorkspaceFocus({
    communicationTestId: "order-communication",
    documentsTestId: "order-documents-section",
  });

  if (!user || isLoading) return <div data-testid="order-loading">{t("common.loading")}</div>;
  if (isError || (isFetched && !order)) return <NotFoundPage />;

  const isOwner = order.ownerUserId === user.id;
  const isCounterparty = order.participants?.some?.(
    (p: { userId: string; participantRole: string }) =>
      p.userId === user.id && p.participantRole === "COUNTERPARTY",
  );

  const orderState = order.state as OrderState;
  const actorRole = user.role as ActorRole;

  const productionUpdates = (statusUpdates as Array<{ label?: string; percentage?: number; updateType: string }> | undefined) ?? [];
  const latestProduction = productionUpdates.filter((u) => u.updateType === "PRODUCTION").at(-1);

  const actions = computeOrderNextActions({
    state: orderState,
    actorRole,
    isOwner,
    isCounterparty: !!isCounterparty,
    inspectionResult: order.inspectionResult,
    productionPercent: latestProduction?.percentage ?? 0,
    freightOfferSelected: isFreightOfferSelected(
      freightSummary?.request
        ? [{
            status: freightSummary.request.status,
            selection: freightSummary.selection,
          }]
        : [],
    ),
  });

  const ORCHESTRATOR_HIDDEN_ACTIONS: ReadonlySet<OrderAction> = new Set([
    "book_shipment", "mark_departed", "mark_arrived", "mark_delivered",
  ]);
  const visibleActions = orchConfig?.hideOrderLogisticsActions
    ? actions.filter((a) => !ORCHESTRATOR_HIDDEN_ACTIONS.has(a.action))
    : actions;

  const orderScript = orderScriptFor(orderState, toWorkspaceScriptRole(actorRole) ?? "BUYER");
  const scriptVars = {
    contractRef: order.contractRef,
    externalRef: order.externalRef,
    supplierName: order.supplierName ?? "—",
    buyerName: order.buyerName ?? "—",
    currency: order.currency ?? "USD",
    totalValue: order.totalValue ?? "—",
    originPort: order.originPort ?? "—",
    destinationPort: order.destinationPort ?? "—",
    inspectionResult: order.inspectionResult ?? "—",
    productionPercent: latestProduction?.percentage ?? 0,
    lastProductionUpdate: latestProduction?.label ?? "—",
    plannedCompletion: "—",
    offerCount: String(
      freightSummary?.offers?.filter((o) => o.status === "ACTIVE" || o.status === "REVISED").length ?? 0,
    ),
    carrierName: "—",
    vesselName: "—",
    eta: order.currentEta ? new Date(order.currentEta).toLocaleDateString() : "—",
    shipmentUrl: (spawnedShipments as Array<{ id: string }> | undefined)?.[0]
      ? `/workspace/shipment/${(spawnedShipments as Array<{ id: string }>)[0].id}`
      : "#order-freightiq-section",
    deliveredAt: "—",
  };

  const primaryAction = orderScript?.primaryAction
    ? visibleActions.find((a) => a.action === orderScript.primaryAction)
      ?? (["PRODUCTION_STARTED", "PRODUCTION_IN_PROGRESS"].includes(orderState)
        ? visibleActions.find((a) => a.action === "report_production_progress")
        : undefined)
    : null;
  const secondaryCount = visibleActions.filter((a) => a.action !== orderScript?.primaryAction).length;

  const submitAction = async (
    action: OrderAction,
    body: { payload: Record<string, unknown>; reason?: string },
  ) => {
    const path = ACTION_PATH[action];
    if (!path) {
      toast.info(`Action ${action} not wired`);
      return;
    }
    setActionBusy(true);
    try {
      await orderApi.action(id!, path, body);
      toast.success(t("common.done"));
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["order", id, "status-updates"] });
      setPendingAction(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? "Action failed");
    } finally {
      setActionBusy(false);
    }
  };

  const runAction = (action: OrderAction) => {
    if (FOCUS_COMMUNICATION_ACTIONS.has(action)) {
      focusWorkspaceCommunication("order-communication");
      return;
    }
    if (FOCUS_DOCUMENTS_ACTIONS.has(action)) {
      focusTradeDocuments("order-documents-section");
      return;
    }
    const meta = visibleActions.find((a) => a.action === action);
    if (meta?.requiresConfirmation) {
      const ok = window.confirm(meta.confirmation ?? `Confirm ${meta.label}?`);
      if (!ok) return;
    }
    if (orderActionNeedsModal(action)) {
      setPendingAction({
        action,
        label: meta?.label ?? action,
        variant: meta?.variant,
        requiresReason: meta?.requiresReason,
        requiresConfirmation: meta?.requiresConfirmation,
      });
      return;
    }
    void submitAction(action, { payload: {} });
  };

  return (
    <div data-testid="order-workspace" className="max-w-5xl mx-auto space-y-6 p-4">
      <header data-testid="order-header" className="space-y-1">
        <span className="text-xs uppercase text-zinc-500">{order.externalRef}</span>
        <h1 className="text-3xl font-semibold">{t("order.title")} {order.contractRef}</h1>
        <p data-testid="order-state" data-state={order.state} className="text-sm text-zinc-600">
          {t("order.state")}: {t(`order.state.${order.state}`, order.state)}
        </p>
        <div className="flex gap-4 text-sm text-zinc-600">
          <span data-testid="order-buyer">{t("order.buyer")}: {order.buyerName}</span>
          <span data-testid="order-supplier">{t("order.supplier")}: {order.supplierName}</span>
          <span data-testid="order-incoterm">{t("order.incoterm")}: {order.incoterms}</span>
        </div>
        {order.spawnedFrom && (
          <Link
            data-testid="order-parent-link"
            className="text-sm text-blue-600"
            to={`/workspace/${order.spawnedFrom.type === "RFQ" ? "rfq" : "commoditybid"}/${order.spawnedFrom.id}`}
          >
            {t("order.parent")}: {order.spawnedFrom.externalRef}
          </Link>
        )}
        <Link
          data-testid="order-trade-workspace-link"
          className="inline-flex text-sm font-medium text-accent-900 hover:underline mt-1"
          to={`/workspace/trade/${order.spawnedFrom?.id ?? id}`}
        >
          {t("order.openTradeWorkspace")}
        </Link>
      </header>

      <WorkspaceProgressBar milestones={orderMilestones(orderState)} label={t("order.progress.label")} testId="order-progress-bar" />

      {orchConfig?.hideOrderLogisticsActions && (
        <p data-testid="order-orchestrator-banner" className="text-sm text-zinc-600 dmx-card px-4 py-3">
          {t("order.orchestratorLogisticsBanner", "Logistics milestones are driven by the shipment workspace.")}
        </p>
      )}

      <WorkspaceWhatHappensNextCard
        testId="order-what-happens-next"
        script={orderScript}
        vars={scriptVars}
        stateKey={orderState}
        primaryLabel={orderScript?.primaryLabel ?? primaryAction?.label}
        loading={actionBusy}
        primaryTestId={primaryAction ? `order-action-${primaryAction.action}` : undefined}
        onPrimaryClick={
          primaryAction
            ? () => runAction(primaryAction.action)
            : orderScript?.fallbackPrimary
              ? () => {
                  const href = orderScript.fallbackPrimary!.href?.replace("{{shipmentUrl}}", String(scriptVars.shipmentUrl));
                  if (href?.startsWith("#")) document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
                  else if (href?.startsWith("/")) window.location.href = href;
                }
              : undefined
        }
      />

      {secondaryCount > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            data-testid="order-more-actions"
            className="text-sm font-medium text-accent-900 hover:underline"
            onClick={() => setDrawerOpen(true)}
          >
            More actions ({secondaryCount})
          </button>
        </div>
      )}

      <OrderActionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        state={orderState}
        actorRole={actorRole}
        isOwner={isOwner}
        isCounterparty={!!isCounterparty}
        inspectionResult={order.inspectionResult}
        productionPercent={latestProduction?.percentage ?? 0}
        freightOfferSelected={isFreightOfferSelected(
          freightSummary?.request
            ? [{ status: freightSummary.request.status, selection: freightSummary.selection }]
            : [],
        )}
        excludeActions={orchConfig?.hideOrderLogisticsActions ? ORCHESTRATOR_HIDDEN_ACTIONS : undefined}
        onRunAction={runAction}
      />

      <PoSummaryPanel orderId={id!} />

      <WorkspaceCommunicationPanel workspaceType="ORDER" workspaceId={id!} testId="order-communication" />

      <OrderStatusCards
        state={orderState}
        productionUpdates={productionUpdates}
        inspectionResult={order.inspectionResult}
      />

      <section data-testid="order-documents-section" className="dmx-card p-4">
        <h2 className="font-medium mb-3">{t("order.tradeDocs")}</h2>
        <Suspense fallback={<div className="text-sm text-zinc-500">Loading documents…</div>}>
          <TradeDocumentsTab workspaceType="ORDER" workspaceId={id!} />
        </Suspense>
      </section>

      <OrderFreightIqPanel
        orderId={id!}
        order={{
          originPort: order.originPort,
          destinationPort: order.destinationPort,
          contractRef: order.contractRef,
          state: order.state,
          externalRef: order.externalRef,
        }}
        spawnedShipments={spawnedShipments as Array<{ id: string; externalRef: string; state: string }> | undefined}
        fullscreenPath={freightiqFullscreenPath}
      />

      {timeline && (timeline as Array<{ id?: string; eventType: string; createdAt: string }>).length > 0 && (
        <WorkspaceTimeline
          testId="order-timeline"
          title={t("order.activity.title")}
          events={(timeline as Array<{ id?: string; eventType: string; createdAt: string }>).map((e, i) => ({
            id: e.id ?? String(i),
            eventType: e.eventType,
            createdAt: e.createdAt,
          }))}
          eventLabels={ORDER_EVENT_LABELS}
        />
      )}

      <section data-testid="order-participants-section" className="dmx-card p-4">
        <h2 className="font-medium">{t("order.participants")}</h2>
        <ul className="text-sm mt-2">
          {order.participants?.map((p: { userId: string; participantRole: string; displayName: string }) => (
            <li key={p.userId}>{p.participantRole}: {p.displayName}</li>
          ))}
        </ul>
      </section>

      <WorkspaceActionModal
        open={modalOpen}
        state={pendingAction}
        workspaceKind="order"
        workspaceId={id!}
        onClose={() => setPendingAction(null)}
        onConfirm={(body) => void submitAction(pendingAction!.action as OrderAction, body)}
        isPending={actionBusy}
      />
    </div>
  );
}
