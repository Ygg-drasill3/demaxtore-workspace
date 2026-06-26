// Sprint 9B — Live reverse-auction engine (scheduling, bids, close, warnings)
import type { Prisma, PrismaClient } from "@prisma/client";
import { Prisma as P } from "@prisma/client";
import { socketBus } from "../../realtime/socket-bus.js";
import { CommodityBidService } from "./commoditybid.service.js";
import { findLowestValidBids } from "./winner-engine.js";
import { logger } from "../../config/logger.js";

const SYSTEM_ACTOR = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "system@demaxtore.local",
  role: "SYSTEM" as const,
};

function generateBidderCode(used: Set<string>): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (let i = 0; i < 100; i++) {
    const code = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
    if (!used.has(code)) return code;
  }
  return `B${Date.now().toString(36).slice(-3).toUpperCase()}`;
}

export class AuctionEngine {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly service = new CommodityBidService(prisma),
  ) {}

  /** Validate reverse-auction bid: must beat current lowest on lot. */
  async validateBid(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    lotId: string,
    unitPrice: number,
    supplierUserId: string,
    isRevise: boolean,
  ): Promise<void> {
    const inv = await tx.commodityBidInvitation.findFirst({
      where: { workspaceId, supplierUserId, removedAt: null },
    });
    if (!inv || inv.status === "DECLINED") {
      throw new Error("NOT_INVITED");
    }

    const existing = await tx.commodityBidSubmission.findUnique({
      where: { lotId_supplierUserId: { lotId, supplierUserId } },
    });
    if (!isRevise && existing && !existing.withdrawnAt) throw new Error("BID_EXISTS");
    if (isRevise && (!existing || existing.withdrawnAt)) throw new Error("NO_BID_TO_REVISE");

    const lowest = await tx.commodityBidSubmission.findFirst({
      where: { lotId, withdrawnAt: null },
      orderBy: { unitPrice: "asc" },
    });
    if (lowest && Number(lowest.unitPrice) <= unitPrice) {
      throw new Error("BID_NOT_LOWER");
    }
  }

  async recordBidEvent(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    lotId: string,
    supplierUserId: string,
    unitPrice: number,
    eventType: "SUBMITTED" | "REVISED",
  ): Promise<void> {
    await tx.commodityBidBidEvent.create({
      data: { workspaceId, lotId, supplierUserId, unitPrice: new P.Decimal(unitPrice), eventType },
    });
  }

  async getCurrentLowest(workspaceId: string, lotId: string) {
    const now = new Date();
    const sub = await this.prisma.commodityBidSubmission.findFirst({
      where: { workspaceId, lotId, withdrawnAt: null, validUntil: { gt: now } },
      orderBy: [{ unitPrice: "asc" }, { createdAt: "asc" }],
      include: { lot: true },
    });
    return sub ? { unitPrice: Number(sub.unitPrice), supplierUserId: sub.supplierUserId } : null;
  }

  emitLowestUpdated(workspaceId: string, lotId: string, unitPrice: number): void {
    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(workspaceId, "auction.lowest.updated", {
        workspaceId, lotId, unitPrice, occurredAt: new Date().toISOString(),
      });
    });
  }

  emitAuctionEvent(event: string, workspaceId: string, extra: Record<string, unknown> = {}): void {
    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(workspaceId, event, {
        workspaceId, occurredAt: new Date().toISOString(), ...extra,
      });
    });
  }

  /** SYSTEM: SCHEDULED → start invitations */
  async processScheduledInvitations(): Promise<void> {
    const rows = await this.prisma.workspace.findMany({
      where: { type: "COMMODITYBID", state: "SCHEDULED" },
      include: { commodityBidDetails: true },
      take: 20,
    });
    for (const ws of rows) {
      try {
        await this.service.applyTransition({
          workspaceId: ws.id,
          action: "start_invitations",
          actor: SYSTEM_ACTOR,
          payload: {},
        });
      } catch (e) {
        logger.warn({ workspaceId: ws.id, err: e }, "start_invitations skipped");
      }
    }
  }

  /** SYSTEM: INVITING_SUPPLIERS → READY_TO_START when invitation deadline passed */
  async processInvitationDeadlines(): Promise<void> {
    const now = new Date();
    const rows = await this.prisma.workspace.findMany({
      where: {
        type: "COMMODITYBID",
        state: "INVITING_SUPPLIERS",
        commodityBidDetails: { invitationDeadlineAt: { lte: now } },
      },
      select: { id: true },
      take: 20,
    });
    for (const ws of rows) {
      try {
        await this.service.applyTransition({
          workspaceId: ws.id,
          action: "invitations_complete",
          actor: SYSTEM_ACTOR,
          payload: {},
        });
      } catch (e) {
        logger.warn({ workspaceId: ws.id, err: e }, "invitations_complete skipped");
      }
    }
  }

  /** SYSTEM: READY_TO_START → LIVE at auctionStartsAt */
  async processAuctionStarts(): Promise<void> {
    const now = new Date();
    const rows = await this.prisma.workspace.findMany({
      where: {
        type: "COMMODITYBID",
        state: "READY_TO_START",
        commodityBidDetails: { auctionStartsAt: { lte: now } },
      },
      select: { id: true },
      take: 20,
    });
    for (const ws of rows) {
      try {
        await this.service.applyTransition({
          workspaceId: ws.id,
          action: "auction_started",
          actor: SYSTEM_ACTOR,
          payload: {},
        });
        this.emitAuctionEvent("auction.started", ws.id);
      } catch (e) {
        logger.warn({ workspaceId: ws.id, err: e }, "auction_started skipped");
      }
    }
  }

  /** SYSTEM: LIVE warnings + close at auctionEndsAt */
  async processLiveAuctions(): Promise<void> {
    const now = new Date();
    const live = await this.prisma.workspace.findMany({
      where: { type: "COMMODITYBID", state: "LIVE" },
      include: { commodityBidDetails: true },
      take: 30,
    });

    for (const ws of live) {
      const ends = ws.commodityBidDetails?.auctionEndsAt;
      const starts = ws.commodityBidDetails?.auctionStartsAt;
      if (!ends) continue;

      const msLeft = ends.getTime() - now.getTime();
      if (msLeft <= 0) {
        await this.closeAuction(ws.id);
        continue;
      }
      if (msLeft <= 5 * 60_000 && msLeft > 4 * 60_000) {
        await this.fireWarning(ws.id, "auction_warning_5min", "auction.warning.5min");
      }
      if (msLeft <= 60_000 && msLeft > 30_000) {
        await this.fireWarning(ws.id, "auction_warning_1min", "auction.warning.1min");
      }
      void starts;
    }
  }

  private async fireWarning(wsId: string, action: "auction_warning_5min" | "auction_warning_1min", socketEvent: string): Promise<void> {
    const key = `warn:${wsId}:${action}`;
    const auditEvent = action === "auction_warning_5min" ? "commoditybid.auction.warning.5min" : "commoditybid.auction.warning.1min";
    const recent = await this.prisma.auditLog.findFirst({
      where: { workspaceId: wsId, action: auditEvent, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } },
    });
    if (recent) return;
    try {
      await this.service.applyTransition({ workspaceId: wsId, action, actor: SYSTEM_ACTOR, payload: { idempotencyKey: key } });
      this.emitAuctionEvent(socketEvent, wsId);
    } catch { /* idempotent */ }
  }

  private async closeAuction(wsId: string): Promise<void> {
    const bids = await this.prisma.commodityBidSubmission.count({
      where: { workspaceId: wsId, withdrawnAt: null },
    });
    const action = bids > 0 ? "auction_closed" : "auction_closed_no_bids";
    try {
      await this.service.applyTransition({ workspaceId: wsId, action, actor: SYSTEM_ACTOR, payload: {} });
      this.emitAuctionEvent("auction.closed", wsId);
      if (bids > 0) await this.selectWinner(wsId);
    } catch (e) {
      logger.warn({ workspaceId: wsId, err: e }, "auction close skipped");
    }
  }

  /** SYSTEM: CLOSED → WINNER_IDENTIFIED → AWAITING_BUYER_APPROVAL */
  async selectWinner(wsId: string): Promise<void> {
    const winners = await this.prisma.$transaction(async (tx) => findLowestValidBids(tx, wsId));
    if (winners.length === 0) {
      await this.service.applyTransition({
        workspaceId: wsId, action: "close_without_award", actor: SYSTEM_ACTOR,
        payload: {}, reason: "No valid bids",
      });
      return;
    }
    try {
      await this.service.applyTransition({ workspaceId: wsId, action: "winner_selected", actor: SYSTEM_ACTOR, payload: {} });
      this.emitAuctionEvent("auction.winner.selected", wsId, { unitPrice: winners[0].unitPrice });
      await this.service.applyTransition({ workspaceId: wsId, action: "require_buyer_approval", actor: SYSTEM_ACTOR, payload: {} });
      this.emitAuctionEvent("auction.approval.required", wsId);
    } catch (e) {
      logger.warn({ workspaceId: wsId, err: e }, "winner selection skipped");
    }
  }

  /** Invite suppliers during start_invitations side effect */
  async inviteSuppliers(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    supplierIds: string[],
    invitedById: string,
  ): Promise<void> {
    const existingCodes = await tx.commodityBidInvitation.findMany({
      where: { workspaceId },
      select: { bidderCode: true },
    });
    const used = new Set(existingCodes.map((c) => c.bidderCode));
    for (const sid of supplierIds) {
      const bidderCode = generateBidderCode(used);
      used.add(bidderCode);
      await tx.commodityBidInvitation.upsert({
        where: { workspaceId_supplierUserId: { workspaceId, supplierUserId: sid } },
        create: {
          workspaceId, supplierUserId: sid, bidderCode, invitedById, status: "INVITED",
        },
        update: { removedAt: null, status: "INVITED", invitedAt: new Date() },
      });
      await tx.workspaceParticipant.upsert({
        where: { workspaceId_userId_participantRole: { workspaceId, userId: sid, participantRole: "COUNTERPARTY" } },
        create: { workspaceId, userId: sid, participantRole: "COUNTERPARTY" },
        update: {},
      });
    }
  }
}

export function createAuctionEngine(prisma: PrismaClient): AuctionEngine {
  return new AuctionEngine(prisma);
}
