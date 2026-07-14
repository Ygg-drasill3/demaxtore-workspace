import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { computeCommodityBidNextActions } from "@dmx/contracts/commoditybid.next-actions";
import { commoditybidApi } from "../lib/commoditybid.api";
import { useAuth } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { WorkspaceGuidancePanel } from "@/features/onboarding/components/WorkspaceGuidancePanel";
import { CommodityBidChecklistPanel } from "@/features/onboarding/components/CommodityBidChecklistPanel";
import { CommodityBidBuyerHero } from "../components/CommodityBidBuyerHero";
import { CommodityBidOrderHandoff } from "../components/CommodityBidOrderHandoff";
import { CommodityBidActionDrawer } from "../components/CommodityBidActionDrawer";
import { commoditybidScriptFor } from "@dmx/contracts/commoditybid.scripts";
import { WorkspaceWhatHappensNextCard } from "@/features/workspace/components/WorkspaceWhatHappensNextCard";
import ConversationHubPanel from "@/features/conversation-hub/components/ConversationHubPanel";
import { EstimatedCifPanel } from "@/features/freight-estimate/components/EstimatedCifPanel";
import { getSocket } from "@/lib/socket";
import { useSingleFlight } from "@/lib/useSingleFlight";
import { focusConversationHub } from "@/features/conversation-hub/lib/focus-conversation-hub";
import { useT } from "@/i18n/useT";
import { showQueryFatalError } from "@/lib/query-guards";
import { getApiErrorMessage } from "@/lib/api-errors";

type CbDto = {
  id: string;
  externalRef: string;
  state: string;
  title: string;
  currency: string;
  targetMarket?: string | null;
  auctionStartsAt?: string | null;
  auctionEndsAt?: string | null;
  lowestBidAmount?: number | null;
  lots: Array<{
    id: string;
    lotNumber: number;
    commodity: string;
    quantity: number;
    uom: string;
    incoterms?: string | null;
  }>;
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CommodityBidWorkspacePage() {
  const { id } = useParams();
  const user = useAuth((s) => s.user);
  const authReady = useAuth((s) => s.status === "authenticated");
  const qc = useQueryClient();
  const { t } = useT();
  const [bidPrice, setBidPrice] = useState("");

  const { data: cb, isLoading, isError, error } = useQuery({
    queryKey: ["commoditybid", id],
    queryFn: () => commoditybidApi.get(id!) as Promise<CbDto>,
    enabled: !!id && authReady,
    refetchInterval: (q) => (q.state.data?.state === "LIVE" ? 5000 : false),
  });

  const { data: status } = useQuery({
    queryKey: ["commoditybid", id, "auction-status"],
    queryFn: () => commoditybidApi.auctionStatus(id!),
    enabled: !!id && authReady,
    refetchInterval: cb?.state === "LIVE" ? 4000 : 10000,
  });

  const { data: feed } = useQuery({
    queryKey: ["commoditybid", id, "bid-feed"],
    queryFn: () => commoditybidApi.bidFeed(id!),
    enabled: !!id && authReady,
    refetchInterval: cb?.state === "LIVE" ? 5000 : false,
  });

  const { data: participation } = useQuery({
    queryKey: ["commoditybid", id, "participation"],
    queryFn: () => commoditybidApi.participation(id!),
    enabled: !!id && authReady,
  });

  const { data: spawnedOrders } = useQuery({
    queryKey: ["commoditybid", id, "spawned-orders"],
    queryFn: () => commoditybidApi.spawnedOrders(id!),
    enabled: !!id && authReady && cb?.state === "ORDERS_SPAWNED",
  });

  useEffect(() => {
    if (!id) return;
    const s = getSocket();
    s.emit("workspace:subscribe", id);
    const refresh = () => void qc.invalidateQueries({ queryKey: ["commoditybid", id] });
    s.on("commoditybid.updated", refresh);
    s.on("auction.bid.submitted", refresh);
    s.on("auction.lowest.updated", refresh);
    s.on("auction.closed", refresh);
    s.on("auction.winner.selected", refresh);
    return () => {
      s.off("commoditybid.updated", refresh);
      s.off("auction.bid.submitted", refresh);
      s.off("auction.lowest.updated", refresh);
      s.off("auction.closed", refresh);
      s.off("auction.winner.selected", refresh);
      s.emit("workspace:unsubscribe", id);
    };
  }, [id, qc]);

  // Defined above the early return (hook) — single-flight guard prevents
  // double-submit from firing duplicate state-changing requests (H11).
  const { run: runAction, busy: actionBusy } = useSingleFlight(async (path: string, body: Record<string, unknown> = {}) => {
    try {
      await commoditybidApi.action(id!, path, { payload: body, reason: body.reason as string | undefined });
      toast.success("Action completed");
      void qc.invalidateQueries({ queryKey: ["commoditybid", id] });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? "Action failed");
    }
  });

  if (!user || !authReady) return <div className="p-8">{t("cb.workspace.loading")}</div>;

  if (isLoading && !cb) return <div className="p-8">{t("cb.workspace.loading")}</div>;

  if (showQueryFatalError({ isLoading, isError, data: cb })) {
    return (
      <div data-testid="query-state-error" className="max-w-lg mx-auto p-8 text-center space-y-3">
        <p className="text-sm text-red-600">
          {getApiErrorMessage(error, t("cb.workspace.error"))}
        </p>
        <button
          type="button"
          className="dmx-btn-secondary text-sm"
          onClick={() => void qc.invalidateQueries({ queryKey: ["commoditybid", id] })}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!cb) return <div className="p-8">{t("cb.workspace.loading")}</div>;

  const lotId = cb.lots[0]?.id;
  const isOwner = user.role === "BUYER";
  const isBuyerView = user.role === "BUYER";
  const actions = computeCommodityBidNextActions({
    state: cb.state as never,
    actorRole: user.role,
    isOwner,
    isCounterparty: user.role === "SUPPLIER",
    hasActiveBidOnAnyLot: false,
  });

  const lotsWithDelivery = cb.lots.map((lot) => ({
    ...lot,
    incoterms: lot.incoterms
      ? lot.incoterms.includes(" ")
        ? lot.incoterms
        : [lot.incoterms, cb.targetMarket].filter(Boolean).join(" ")
      : cb.targetMarket ?? null,
  }));

  const submitBid = async () => {
    const validUntil = new Date(Date.now() + 5 * 86400_000).toISOString();
    await commoditybidApi.submitBid(id!, lotId, {
      unitPrice: Number(bidPrice),
      validUntil,
      leadTimeDays: 14,
      moq: 1,
      paymentTerms: "Net 30",
      deliveryTerms: "FOB",
    });
    toast.success("Bid submitted");
    void qc.invalidateQueries({ queryKey: ["commoditybid", id] });
  };

  const countdown = status?.secondsRemaining ?? 0;
  const untilStart = status?.secondsUntilStart ?? 0;

  const cbScript = isBuyerView ? commoditybidScriptFor(cb.state as never, "BUYER") : undefined;
  const scriptVars = {
    lotCount: String(cb.lots.length),
    commodity: cb.lots[0]?.commodity ?? "—",
    countdown: cb.state === "LIVE" ? formatCountdown(countdown) : formatCountdown(untilStart),
    lowestBid: status?.lowestBidAmount != null ? `$${status.lowestBidAmount}` : "—",
    joinedCount: String(participation?.joined ?? 0),
    winnerName: "Lowest bidder",
    savings: status?.savingsAchieved != null ? `$${status.savingsAchieved}` : "—",
    orderCount: String((spawnedOrders as Array<unknown> | undefined)?.length ?? 0),
    firstOrderUrl: (spawnedOrders as Array<{ id: string }> | undefined)?.[0]
      ? `/workspace/order/${(spawnedOrders as Array<{ id: string }>)[0].id}`
      : "#",
  };

  const primaryCbAction = cbScript?.primaryAction
    ? actions.find((a) => a.action === cbScript.primaryAction)
    : null;

  const handleCbAction = (act: string) => {
    if (act === "approve_winner") void runAction("approve-winner");
    else if (act === "spawn_orders") void runAction("spawn-orders");
    else if (act === "invite_suppliers") toast.info("Use supplier invitation flow in auction setup.");
    else if (act === "post_clarification") focusConversationHub("cb-communication");
    else toast.info(`Action ${act}`);
  };

  return (
    <div data-testid="cb-workspace" className="max-w-6xl mx-auto space-y-6 p-4">
      {isBuyerView ? (
        <>
          <CommodityBidBuyerHero
            title={cb.title}
            externalRef={cb.externalRef}
            state={cb.state}
            currency={cb.currency}
            lots={lotsWithDelivery}
            status={status}
            participation={participation}
          />
          <p data-testid="cb-state" className="sr-only">Auction state: {cb.state.replace(/_/g, " ")}</p>
        </>
      ) : (
        <header data-testid="cb-auction-overview">
          <span className="text-xs uppercase text-zinc-500">{cb.externalRef}</span>
          <h1 className="text-3xl font-semibold">{cb.title}</h1>
          <p data-testid="cb-state" className="text-sm text-zinc-600">Auction state: {cb.state.replace(/_/g, " ")}</p>
        </header>
      )}

      {!isBuyerView && (
        <section data-testid="cb-countdown" className="dmx-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase">Countdown</p>
            {cb.state === "LIVE" && (
              <p data-testid="cb-countdown-live" className="text-2xl font-semibold tabular-nums">{formatCountdown(countdown)}</p>
            )}
            {["SCHEDULED", "INVITING_SUPPLIERS", "READY_TO_START"].includes(cb.state) && (
              <p data-testid="cb-countdown-start" className="text-2xl font-semibold tabular-nums">Starts in {formatCountdown(untilStart)}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Current lowest bid</p>
            <p className="text-xl font-semibold">
              {status?.lowestBidAmount != null ? `$${status.lowestBidAmount}` : "—"}
            </p>
          </div>
        </section>
      )}

      {isBuyerView && cbScript && (
        <WorkspaceWhatHappensNextCard
          testId="cb-what-happens-next"
          script={cbScript}
          vars={scriptVars}
          stateKey={cb.state}
          primaryLabel={cbScript.primaryLabel ?? primaryCbAction?.label}
          onPrimaryClick={
            primaryCbAction
              ? () => handleCbAction(primaryCbAction.action)
              : cbScript.fallbackPrimary
                ? () => {
                    const href = cbScript.fallbackPrimary!.href?.replace("{{firstOrderUrl}}", String(scriptVars.firstOrderUrl));
                    if (href?.startsWith("/")) window.location.href = href;
                  }
                : undefined
          }
        />
      )}

      {isBuyerView && (
        <CommodityBidActionDrawer
          state={cb.state as never}
          actorRole={user.role}
          isOwner={isOwner}
          isCounterparty={user.role === "SUPPLIER"}
          onRunAction={handleCbAction}
        />
      )}

      <WorkspaceGuidancePanel workspaceType="commoditybid" workspaceId={id!} />
      {isBuyerView && <CommodityBidChecklistPanel state={cb.state} />}

      {!isBuyerView && (
        <section data-testid="cb-participation" className="dmx-card p-4">
          <h2 className="font-medium mb-2">Supplier participation</h2>
          <p className="text-sm text-zinc-600">
            {participation?.joined ?? 0} joined · {participation?.invited ?? 0} invited
          </p>
        </section>
      )}

      <section data-testid="cb-bid-feed" className="dmx-card p-4">
        <h2 className="font-medium mb-2">Live bid feed</h2>
        <ul className="text-sm space-y-1 max-h-48 overflow-auto">
          {(feed as Array<{ eventType: string; unitPrice: number; createdAt: string }> | undefined)?.map((e, i) => (
            <li key={i} data-testid="cb-bid-feed-item">
              {e.eventType} · ${e.unitPrice} · {new Date(e.createdAt).toLocaleTimeString()}
            </li>
          )) ?? <li className="text-zinc-500">No bids yet</li>}
        </ul>
      </section>

      <ConversationHubPanel workspaceType="COMMODITYBID" workspaceId={id!} testId="cb-communication" />

      {!isBuyerView && (
      <section data-testid="cb-next-actions" className="dmx-card p-4 flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.action}
            data-testid={`cb-action-${a.action}`}
            className={(a.variant === "primary" ? "dmx-btn-primary text-sm" : "dmx-btn-secondary text-sm") + " disabled:opacity-60"}
            disabled={actionBusy}
            onClick={() => {
              const act = a.action;
              if (act === "approve_winner") void runAction("approve-winner");
              else if (act === "reject_result") {
                const reason = window.prompt("Reject result: enter reason (required)") ?? "";
                if (!reason.trim()) return;
                void runAction("reject-result", { reason: reason.trim() });
              } else if (act === "spawn_orders") void runAction("spawn-orders");
              else if (act === "supplier_accept_invitation") void runAction("accept-invitation");
              else if (act === "supplier_decline_invitation") void runAction("decline-invitation");
              else if (act === "supplier_join_auction") void runAction("join-auction");
              else if (act === "post_clarification") focusConversationHub("cb-communication");
              else if (act === "submit_bid_lot" || act === "revise_bid_lot") {
                document.querySelector('[data-testid="cb-supplier-bid-form"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
              } else if (act === "withdraw_bid_lot" && lotId) {
                void commoditybidApi.withdrawBid(id!, lotId).then(() => {
                  toast.success("Bid withdrawn");
                  void qc.invalidateQueries({ queryKey: ["commoditybid", id] });
                }).catch((e: unknown) => {
                  const err = e as { response?: { data?: { error?: { message?: string } } } };
                  toast.error(err.response?.data?.error?.message ?? "Withdraw failed");
                });
              } else if (act === "cancel_bid") {
                if (a.requiresConfirmation && !window.confirm(a.confirmation ?? "Cancel this auction?")) return;
                const reason = window.prompt("Cancel auction: enter reason (required)");
                if (!reason?.trim()) return;
                void runAction("cancel", { reason: reason.trim() });
              } else if (act === "schedule_auction") {
                document.querySelector('[data-testid="cb-first-trade-checklist"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
                toast.info("Use the create flow or API to schedule auction dates and suppliers.");
              } else toast.info(`Use dedicated UI for ${act}`);
            }}
          >
            {a.label}
          </button>
        ))}
      </section>
      )}

      {isBuyerView && cb.state === "ORDERS_SPAWNED" && spawnedOrders && (
        <CommodityBidOrderHandoff orders={spawnedOrders as Array<{ id: string; externalRef: string }>} />
      )}

      {user.role === "SUPPLIER" && cb.state === "LIVE" && lotId && (
        <section data-testid="cb-supplier-bid-form" className="dmx-card p-4 space-y-2">
          <h2 className="font-medium">Submit live bid</h2>
          <p className="text-xs text-zinc-500">Your bid must beat the current lowest price.</p>
          <input data-testid="cb-bid-price" value={bidPrice} onChange={(e) => setBidPrice(e.target.value)} className="h-10 px-3 border rounded-lg" />
          <button data-testid="cb-submit-bid" onClick={() => void submitBid()} className="dmx-btn-primary">Submit Bid</button>
        </section>
      )}

      {["WINNER_IDENTIFIED", "AWAITING_BUYER_APPROVAL"].includes(cb.state) && isOwner && (
        <section data-testid="cb-winner-summary" className="dmx-card p-4">
          <h2 className="font-medium mb-2">Winner summary</h2>
          <p className="text-sm text-zinc-600">
            Lowest valid bid: <strong>${status?.lowestBidAmount ?? cb.lowestBidAmount ?? "—"}</strong>
          </p>
          {status?.contractValue != null && (
            <p className="text-sm text-zinc-600 mt-1">
              Contract value: <strong>${status.contractValue.toLocaleString()}</strong>
            </p>
          )}
          {status?.savingsAchieved != null && status.savingsAchieved > 0 && (
            <p data-testid="cb-winner-savings" className="text-sm text-emerald-700 mt-1">
              Savings achieved: <strong>${status.savingsAchieved.toLocaleString()}</strong>
              {status.savingsPercent != null && ` (${status.savingsPercent.toFixed(1)}% below opening bid)`}
            </p>
          )}
          <p className="text-xs text-zinc-500 mt-2">Approve to start order execution. You cannot manually select a different supplier.</p>
          <div className="flex gap-2 mt-3">
            <button data-testid="cb-approve-winner" className="dmx-btn-primary disabled:opacity-60" disabled={actionBusy} onClick={() => void runAction("approve-winner")}>
              Approve Winner
            </button>
            <button data-testid="cb-reject-result" className="dmx-btn-secondary disabled:opacity-60" disabled={actionBusy} onClick={() => void runAction("reject-result", { reason: "Rejected by buyer" })}>
              Reject Result
            </button>
          </div>
        </section>
      )}

      {id && ["WINNER_IDENTIFIED", "AWAITING_BUYER_APPROVAL", "APPROVED"].includes(cb.state) && (
        <EstimatedCifPanel tradeId={id} />
      )}

      {cb.state === "APPROVED" && isOwner && (
        <section data-testid="cb-spawn-orders-panel" className="dmx-card p-4">
          <p className="text-sm text-zinc-600 mb-2">Winner approved. Start order execution.</p>
          <button data-testid="cb-spawn-orders" className="dmx-btn-primary disabled:opacity-60" disabled={actionBusy} onClick={() => void runAction("spawn-orders")}>
            Start order execution
          </button>
        </section>
      )}

      {!isBuyerView && spawnedOrders && (spawnedOrders as Array<{ id: string; externalRef: string }>).length > 0 && (
        <section data-testid="cb-spawned-orders" className="dmx-card p-4">
          <h2 className="font-medium mb-2">Spawned orders</h2>
          <ul className="text-sm space-y-1">
            {(spawnedOrders as Array<{ id: string; externalRef: string }>).map((o) => (
              <li key={o.id} data-testid="cb-spawned-order">
                <a href={`/workspace/order/${o.id}`} className="text-blue-600 underline">{o.externalRef}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section data-testid="cb-timeline" className="dmx-card p-4">
        <h2 className="font-medium mb-2">Auction timeline</h2>
        <p className="text-xs text-zinc-500">State transitions and bid events are recorded in the workspace audit trail.</p>
      </section>
    </div>
  );
}
