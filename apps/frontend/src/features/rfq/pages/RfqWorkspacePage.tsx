// apps/frontend/src/features/rfq/pages/RfqWorkspacePage.tsx
//
// Sprint 2.5 — new layout per /app/docs/sprint-2.5-ux-redesign-wireframes.md §3:
//   A Header  · B Storyline  · C What Happens Next  · D Supplier Activity Strip
//   E Quotations Panel  · F Side Context (money/docs/participants)
//   G Clarifications full-width  · H Timeline (collapsed)
//
import { useEffect, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useT } from "@/i18n/useT";
import { useQuery } from "@tanstack/react-query";
import { useRfqWorkspace, useRfqRealtime } from "../hooks";
import { rfqApi } from "../lib/rfq.api";
import { RfqSpawnedOrdersPanel } from "../components/RfqSpawnedOrdersPanel";
import { useSupplierActivitySummary, supplierActivityKeys } from "../hooks/useSupplierActivity";
import { useQueryClient } from "@tanstack/react-query";
import { useQuotations } from "../hooks/useQuotations";
import { useAuth } from "@/store/auth.store";
import { useTelemetry } from "@/features/telemetry/useTelemetry";
import { RfqStateBadge } from "../components/RfqStateBadge";
import { RfqProgressBar } from "../components/RfqProgressBar";
import { RfqTimeline } from "../components/RfqTimeline";
import ConversationHubPanel from "@/features/conversation-hub/components/ConversationHubPanel";
import { RfqNextActions } from "../components/RfqNextActions";
import { RfqParticipants } from "../components/RfqParticipants";
import { RfqDocumentsPanel } from "../components/RfqDocumentsPanel";
import { WhatHappensNextCard } from "../components/WhatHappensNextCard";
import { WaitingStateCard } from "../components/WaitingStateCard";
import { SupplierActivityStrip } from "../components/SupplierActivityStrip";
import { QuotationComparisonPanel } from "../components/QuotationComparisonPanel";
import { productSectionTitle, type RfqLineRef } from "../lib/quotations-by-product";
import { SupplierQuoteForm } from "../components/SupplierQuoteForm";
import { SupplierProformaForm } from "../components/SupplierProformaForm";
import { WorkspaceSkeleton } from "@/components/ui/SkeletonLoader";
import { Badge } from "@/components/ui/Badge";
import { waitingScriptFor } from "../lib/rfq.scripts";
import { SupplierRfqGuidance } from "../components/SupplierRfqGuidance";
import { focusRfqCommunication } from "../lib/focus-communication";
import { useWorkspaceFocus } from "@/features/workspace/lib/useWorkspaceFocus";
import { TradeProgressBar } from "@/features/onboarding/components/TradeProgressBar";
import { useOnboardingProgress } from "@/features/onboarding/hooks";
import { LazyMount } from "@/components/ui/LazyMount";
import { EstimatedCifPanel } from "@/features/freight-estimate/components/EstimatedCifPanel";
import { FreightBookingPanel } from "@/features/freight-booking/components/FreightBookingPanel";
import { RfqDetailsPanel } from "../components/RfqDetailsPanel";
import { RfqPdfButton } from "../components/RfqPdfButton";
import { Lock, CheckCircle2 } from "lucide-react";
import type { RfqState } from "@dmx/contracts/rfq.fsm";
import { showQueryFatalError } from "@/lib/query-guards";
import { getApiErrorMessage } from "@/lib/api-errors";

function deadlineCountdown(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0)             return `Overdue · ${Math.abs(Math.floor(ms / 3.6e6))}h ago`;
  const h = Math.floor(ms / 3.6e6);
  if (h < 24)             return `${h}h left · today`;
  const d = Math.floor(h / 24);
  if (d < 8)              return `${d}d ${h - d * 24}h left`;
  return `${d}d left`;
}

export default function RfqWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { data: rfq, isLoading, isError, error, refetch, isFetched, isFetching } = useRfqWorkspace(id);
  const user = useAuth((s) => s.user);
  const { t } = useT();
  const { track } = useTelemetry();
  useRfqRealtime(id);

  const qc = useQueryClient();
  const supplierSummary = useSupplierActivitySummary(id);
  const quotations = useQuotations(id, rfq?.state as RfqState | undefined);

  const { data: spawnedOrders } = useQuery({
    queryKey: ["rfq", id, "spawned-orders"],
    queryFn: () => rfqApi.spawnedOrders(id!),
    enabled: !!id && (rfq?.state === "PO_ISSUED" || rfq?.state === "CLOSED"),
  });
  const onboarding = useOnboardingProgress();

  useWorkspaceFocus({ communicationTestId: "rfq-communication" });

  // Telemetry — workspace viewed (deduped once per mount).
  const viewRecorded = useRef(false);
  useEffect(() => {
    if (!id) return;
    track("workspace.viewed", { workspaceId: id });
    if (
      !viewRecorded.current &&
      user?.role === "SUPPLIER" &&
      (rfq as any)?.participants?.some?.(
        (p: { userId: string; participantRole: string }) =>
          p.userId === user.id && p.participantRole === "COUNTERPARTY",
      )
    ) {
      viewRecorded.current = true;
      api.post(`/rfq/${id}/supplier-activity/view`).then(() => {
        qc.invalidateQueries({ queryKey: supplierActivityKeys.summary(id) });
        qc.invalidateQueries({ queryKey: supplierActivityKeys.detail(id) });
      }).catch((err) => {
        // Recording the view must not block the workspace, but a failure should not
        // vanish either — buyers rely on this for supplier engagement signals.
        console.warn("[rfq] failed to record supplier view", err);
      });
    }
  }, [id, track, user?.id, user?.role, rfq, qc]);

  useEffect(() => {
    if (!id || isLoading || isFetching || !isFetched || user?.role !== "BUYER") return;
    if (!rfq?.procurementMethod) {
      nav(`/workspace/rfq/${id}/procurement-strategy`, { replace: true });
    } else if (rfq.procurementMethod === "COMMODITYBID_AUCTION" && rfq.linkedCommoditybidId) {
      nav(`/workspace/commoditybid/${rfq.linkedCommoditybidId}`, { replace: true });
    }
  }, [rfq, isLoading, isFetching, isFetched, user?.role, id, nav]);

  const estimatedValue = useMemo(() => {
    const items = (rfq as any)?.lineItems as Array<{ quantity?: number; targetPrice?: number }> | undefined;
    if (!items) return null;
    const sum = items.reduce((acc, it) => acc + (it.quantity ?? 0) * (it.targetPrice ?? 0), 0);
    return sum > 0 ? sum : null;
  }, [rfq]);

  const hasQuotationFromUser = useMemo(() => {
    if (!user?.id || !quotations.data?.length) return false;
    return quotations.data.some(
      (q) => q.supplierId === user.id && q.status !== "WITHDRAWN",
    );
  }, [quotations.data, user?.id]);

  const productSummary = useMemo(() => {
    if (!rfq) return undefined;
    const r = rfq as {
      title?: string;
      productCategory?: string;
      productImageUrl?: string | null;
      targetMarket?: string;
      incoterm?: string;
      deadlineAt?: string | null;
      lineItems?: Array<{ quantity?: number; uom?: string }>;
    };
    const items = (r.lineItems ?? []) as Array<{
      quantity?: number;
      uom?: string;
      description?: string;
      imageUrl?: string | null;
    }>;
    let quantity: string | undefined;
    if (items.length === 1) {
      const li = items[0];
      quantity = `${li.quantity ?? 1} ${li.uom ?? ""}`.trim();
    } else if (items.length > 1) {
      quantity = `${items.length} products`;
    }

    const products = items.length > 1
      ? items.map((li) => ({
          name: productSectionTitle(li.description ?? "Product"),
          category: li.description,
          imageUrl: li.imageUrl ?? undefined,
          quantity: `${li.quantity ?? 1} ${li.uom ?? ""}`.trim(),
        }))
      : undefined;

    const primary = items[0];
    const category = primary?.description || r.productCategory || r.title || "";

    return {
      name: r.title || r.productCategory || "Product",
      category,
      imageUrl: items.length === 1 ? (primary?.imageUrl ?? r.productImageUrl ?? undefined) : undefined,
      products,
      quantity,
      destination: r.targetMarket || undefined,
      incoterm: r.incoterm || undefined,
      deadline: r.deadlineAt ?? undefined,
    };
  }, [rfq]);

  if (!user) return <WorkspaceSkeleton />;

  if (isLoading && !rfq) return <WorkspaceSkeleton />;

  if (showQueryFatalError({ isLoading, isError, data: rfq })) {
    const listPath =
      user?.role === "SUPPLIER" ? "/supplier/rfq"
      : user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" ? "/admin/rfq"
      : "/buyer/rfq";

    return (
      <div data-testid="query-state-error" className="max-w-lg mx-auto p-8 text-center space-y-4">
        <p className="text-sm text-red-600">{getApiErrorMessage(error, t("rfq.workspace.error"))}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" className="dmx-btn-secondary text-sm" onClick={() => void refetch()}>
            {t("common.retry")}
          </button>
          <Link to={listPath} className="dmx-btn-primary text-sm">
            {t("rfq.list.title")}
          </Link>
        </div>
      </div>
    );
  }

  if (!rfq) return <WorkspaceSkeleton />;

  const isOwner = rfq.ownerUserId === user.id;
  const isCounterparty = (rfq as any).participants?.some?.(
    (p: any) => p.userId === user.id && p.participantRole === "COUNTERPARTY",
  ) ?? false;
  const isSelectedSupplier = rfq.selectedSupplierUserId === user.id;

  const counterpartyCount =
    (rfq as { participants?: Array<{ participantRole: string }> }).participants?.filter(
      (p) => p.participantRole === "COUNTERPARTY",
    ).length ?? 0;
  const invitedCount = supplierSummary.data?.invited ?? counterpartyCount;

  const firstSpawnedOrderId = (spawnedOrders as Array<{ id: string }> | undefined)?.[0]?.id ?? null;

  const selectedQuotationId =
    (rfq as { selectedQuotationId?: string | null }).selectedQuotationId ??
    quotations.data?.find((q) => q.supplierId === rfq.selectedSupplierUserId)?.id ??
    null;

  // Variables consumed by RFQ_SCRIPTS / WAITING_SCRIPTS templates.
  const vars = {
    orderId: firstSpawnedOrderId,
    currency: rfq.currency,
    estimatedValue: estimatedValue?.toLocaleString(),
    invited: invitedCount,
    viewed:  supplierSummary.data?.viewed  ?? 0,
    quoted:  supplierSummary.data?.quoted  ?? 0,
    deadlineCountdown: deadlineCountdown(rfq.deadlineAt),
    deadline: rfq.deadlineAt ? new Date(rfq.deadlineAt).toLocaleString() : "—",
    assignedCount: invitedCount,
    selectedSupplier: (rfq as any).selectedSupplierName ?? "the selected supplier",
    lockedAmount: (rfq as any).lockedAmount?.toLocaleString() ?? "—",
    proformaSlaDays: (rfq as any).proformaSlaDaysLeft ?? "—",
    queuePosition:   (rfq as any).queuePosition ?? "—",
    proformaAmount:  (rfq as any).proformaAmount?.toLocaleString() ?? "—",
    rangeLow:  quotations.data?.length ? Math.min(...quotations.data.map(q => q.total)).toLocaleString() : "—",
    rangeHigh: quotations.data?.length ? Math.max(...quotations.data.map(q => q.total)).toLocaleString() : "—",
    closedAt: (rfq as any).quotationsClosedAt ? new Date((rfq as any).quotationsClosedAt).toLocaleDateString() : "—",
    cancelledAt: (rfq as any).cancelledAt ? new Date((rfq as any).cancelledAt).toLocaleDateString() : "—",
    originalDeadline: rfq.deadlineAt ? new Date(rfq.deadlineAt).toLocaleDateString() : "—",
    reason: (rfq as any).closureReason ?? "—",
    poNumber: (rfq as any).poNumber ?? "—",
    poAmount: (rfq as any).poAmount?.toLocaleString() ?? "—",
    category: (rfq as any).productCategory ?? "this category",
    earliestExpiry: (rfq as any).earliestQuoteExpiry
      ? new Date((rfq as any).earliestQuoteExpiry).toLocaleDateString() : "—",
    slaDeadline: (rfq as any).reviewSlaDeadline
      ? new Date((rfq as any).reviewSlaDeadline).toLocaleString() : "tomorrow 18:00",
  };

  const state = rfq.state as RfqState;

  // Narrow ActorRole — UI components don't accept SYSTEM.
  const actor: { id: string; role: "BUYER" | "SUPPLIER" | "ADMIN" } = {
    id: user.id,
    role: (user.role === "BUYER" || user.role === "SUPPLIER" || user.role === "ADMIN")
      ? user.role : "BUYER",
  };

  const isSupplier = user.role === "SUPPLIER";
  const isPureWaitingState = !!waitingScriptFor(state, actor.role);
  const youAre = isOwner
    ? (isSupplier ? "You’re quoting" : "You’re buying")
    : isCounterparty
      ? (isSupplier ? "You’re quoting" : "You’re invited")
      : null;

  return (
    <div data-testid="rfq-workspace" className="space-y-5 max-w-[1400px] mx-auto animate-fade-in pb-12">
      {/* ────────  A · Header  ──────── */}
      <header data-testid="rfq-workspace-header" className="dmx-card p-7">
        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-500">
              <span>{rfq.externalRef ?? rfq.id.slice(0, 8)}</span>
              {youAre && (
                <>
                  <span className="text-zinc-300">·</span>
                  <Badge tone="neutral" data-testid="you-are-pill">{youAre}</Badge>
                </>
              )}
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 mt-2">
              {rfq.title}
            </h1>
            <div className="text-xs text-zinc-500 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {!isSupplier && <span>{rfq.ownerName}</span>}
              {!isSupplier && <span>·</span>}
              <span>Created {new Date(rfq.createdAt).toLocaleDateString()}</span>
              <span className="inline-flex items-center gap-1">
                · {rfq.currency} <Lock className="h-3 w-3 text-zinc-400" aria-label="Currency is locked after submission" />
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {!isSupplier && <RfqPdfButton rfq={rfq} />}
              {isSupplier && hasQuotationFromUser && state === "RFQ_OPEN" && (
                <Badge tone="success" data-testid="rfq-my-quote-submitted">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Quote submitted
                </Badge>
              )}
              <RfqStateBadge state={rfq.state} />
            </div>
            {rfq.deadlineAt && (
              <div className="text-xs text-zinc-500" data-testid="header-deadline">
                Deadline · <span className="font-medium text-ink-900">{deadlineCountdown(rfq.deadlineAt)}</span>
              </div>
            )}
          </div>
        </div>
        {onboarding.data?.milestones && (
          <div className="mt-4 pt-4 border-t border-paper-200">
            <TradeProgressBar milestones={onboarding.data.milestones} compact />
          </div>
        )}
      </header>

      {/* ────────  B · State Storyline  ──────── */}
      <RfqProgressBar
        state={rfq.state}
        meta={{
          invited: vars.invited as number, quoted: vars.quoted as number,
          assignedSuppliers: vars.assignedCount as number,
          terminalReason: vars.reason as string,
        }}
      />

      {/* ────────  C · What Happens Next (hero)  ──────── */}
      <WhatHappensNextCard
        workspaceId={rfq.id}
        state={state}
        vars={vars}
        actor={actor}
        isOwner={isOwner}
        isCounterparty={isCounterparty}
        isSelectedSupplier={isSelectedSupplier}
        hasQuotationFromUser={hasQuotationFromUser}
      />

      {id && ["SUPPLIER_SELECTED", "PROFORMA_REQUESTED", "PROFORMA_RECEIVED", "PROFORMA_APPROVED"].includes(state) && (
        <EstimatedCifPanel tradeId={id} />
      )}

      {(state === "PO_ISSUED" || state === "CLOSED") && id && (
        <FreightBookingPanel
          tradeId={id}
          canSelect={user.role === "ADMIN" || user.role === "BUYER"}
          canConfirm={user.role === "ADMIN"}
        />
      )}

      {(state === "PO_ISSUED" || state === "CLOSED") && id && <RfqSpawnedOrdersPanel workspaceId={id} />}
      {user.role === "ADMIN" && (state === "PO_ISSUED" || state === "CLOSED") && id && (
        <section data-testid="rfq-freight-intake-link" className="dmx-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="dmx-eyebrow text-zinc-500">Freight</span>
            <p className="text-sm font-medium mt-0.5">{t("freightiq.intake.addOffersFromRfq")}</p>
          </div>
          <Link
            to={`/admin/freightiq?workspaceRfqId=${id}`}
            className="dmx-btn-primary text-sm"
            data-testid="rfq-open-freight-intake"
          >
            {t("freightiq.intake.addOffersFromRfq")} →
          </Link>
        </section>
      )}

      {/* ────────  RFQ specification (full details)  ──────── */}
      <RfqDetailsPanel rfq={rfq} isOwner={isOwner} hideBuyerFields={isSupplier} />

      {/* ────────  Secondary actions trigger  ──────── */}
      <RfqNextActions
        workspaceId={rfq.id}
        state={state}
        actor={actor}
        isOwner={isOwner}
        isCounterparty={isCounterparty}
        isSelectedSupplier={isSelectedSupplier}
        hasQuotationFromUser={hasQuotationFromUser}
        onFocusCommunication={focusRfqCommunication}
      />

      {/* ────────  D · Supplier Activity Strip  ──────── */}
      {!isSupplier && <SupplierActivityStrip workspaceId={rfq.id} state={state} />}

      {user.role === "SUPPLIER" && (
        <SupplierRfqGuidance state={state} isCounterparty={isCounterparty} isSelectedSupplier={isSelectedSupplier} />
      )}

      {/* ────────  Waiting state — extra 4-section card  ──────── */}
      {isPureWaitingState && (
        <WaitingStateCard state={state} vars={vars} actorRole={actor.role} />
      )}

      {/* ────────  E · Supplier forms (supplier-only, full width)  ──────── */}
      {user.role === "SUPPLIER" && isCounterparty && state === "RFQ_OPEN" && (
        <SupplierQuoteForm
          workspaceId={rfq.id}
          currency={rfq.currency ?? "USD"}
          rfqLineItems={(rfq as { lineItems?: Array<{ id: string; position: number; description: string; quantity: number; uom: string }> }).lineItems ?? []}
          allowedQuoteLineItemIds={(rfq as { allowedQuoteLineItemIds?: string[] | null }).allowedQuoteLineItemIds}
          defaultIncoterm={(rfq as { incoterm?: string }).incoterm}
        />
      )}
      {user.role === "SUPPLIER" && isSelectedSupplier && state === "PROFORMA_REQUESTED" && (
        <SupplierProformaForm
          workspaceId={rfq.id}
          currency={rfq.currency ?? "USD"}
          lockedAmount={(rfq as { lockedAmount?: number }).lockedAmount ?? vars.lockedAmount}
        />
      )}

      {/* ────────  E · Quotations — full width  ──────── */}
          <QuotationComparisonPanel
            workspaceId={rfq.id}
            state={state}
            rfqLineItems={((rfq as { lineItems?: RfqLineRef[] }).lineItems) ?? []}
            buyerTargetTotal={isSupplier ? undefined : estimatedValue ?? undefined}
            selectedQuotationId={selectedQuotationId}
            isOwner={isOwner}
            productSummary={productSummary}
          />

      {/* ────────  F · Workspace files + participants  ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <LazyMount>
          <RfqDocumentsPanel workspaceId={rfq.id} />
        </LazyMount>
        {!isSupplier && <RfqParticipants workspaceId={rfq.id} />}
      </div>

      {/* ────────  G · Conversation Hub (business timeline)  ──────── */}
      <LazyMount>
        <ConversationHubPanel workspaceType="RFQ" workspaceId={rfq.id} testId="rfq-communication" />
      </LazyMount>

      {/* ────────  H · Timeline (collapsed)  ──────── */}
      <RfqTimeline workspaceId={rfq.id} collapsed />
    </div>
  );
}
