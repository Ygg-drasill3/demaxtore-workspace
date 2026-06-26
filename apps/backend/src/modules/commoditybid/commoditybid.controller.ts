import type { Request, Response } from "express";
import { z } from "zod";
import {
  CreateCommodityBidDraftInput, ActionEnvelope, ScheduleAuctionPayload,
  CancelBidPayload, SubmitBidLotPayload, ReviseBidLotPayload, WithdrawBidLotPayload,
  ListCommodityBidQuery,
} from "@dmx/contracts/commoditybid.zod";
import { computeCommodityBidNextActions } from "@dmx/contracts/commoditybid.next-actions";
import type { CommodityBidAction } from "@dmx/contracts/commoditybid.fsm";
import { CommodityBidService } from "./commoditybid.service.js";
import { RfqService } from "../rfq/rfq.service.js";
import { runCommodityBidSchedulerTick } from "./commoditybid.scheduler.js";
import { canAccessCommodityBid, canViewSupplierIdentity } from "./commoditybid.policy.js";
import { prisma } from "../../db.js";
import { toActorRole } from "../../types/auth-user.js";
import { AppError } from "../../utils/httpErrors.js";

const service = new CommodityBidService(prisma);
const rfqService = new RfqService(prisma);

const RejectResultPayload = z.object({ reason: z.string().min(3).max(2000) });
const DeclineInvitationPayload = RejectResultPayload;

const PAYLOAD_SCHEMAS: Partial<Record<CommodityBidAction, z.ZodTypeAny>> = {
  schedule_auction: ScheduleAuctionPayload,
  cancel_bid: CancelBidPayload,
  reject_result: RejectResultPayload,
  supplier_decline_invitation: DeclineInvitationPayload,
  submit_bid_lot: SubmitBidLotPayload,
  revise_bid_lot: ReviseBidLotPayload,
  withdraw_bid_lot: WithdrawBidLotPayload,
};

async function loadAccessible(req: Request) {
  const ws = await prisma.workspace.findUnique({
    where: { id: req.params.id },
    include: {
      commodityBidDetails: true,
      commodityBidLots: true,
      commodityBidInvitations: { where: { removedAt: null } },
      participants: true,
      createdBy: { select: { displayName: true } },
    },
  });
  if (!ws || ws.type !== "COMMODITYBID") throw new AppError(404, "COMMODITYBID_NOT_FOUND");
  if (!(await canAccessCommodityBid(prisma, req.user!, ws.id))) throw new AppError(403, "FORBIDDEN");
  return ws;
}

export const commoditybidController = {
  async lookupSuppliers(req: Request, res: Response) {
    const q = z.object({
      q: z.string().max(200).optional(),
      category: z.string().optional(),
      country: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(req.query);
    res.json(await rfqService.lookupSuppliers(q));
  },

  async createDraft(req: Request, res: Response) {
    const input = CreateCommodityBidDraftInput.parse(req.body);
    const dto = await service.createDraft(input, req.user!) as { id: string };
    await service.applyTransition({
      workspaceId: dto.id,
      action: "schedule_auction",
      actor: { id: req.user!.id, email: req.user!.email, role: toActorRole(req.user!.role) },
      payload: {
        auctionStartsAt: input.auctionStartsAt,
        auctionDurationMinutes: input.auctionDurationMinutes,
        invitationDeadlineMinutes: input.invitationDeadlineMinutes,
        supplierUserIds: input.supplierUserIds,
      },
    });
    res.status(201).json(await service.fetchDTO(dto.id, req.user!));
  },

  async get(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    res.json(await service.toDTO(ws as never, req.user!));
  },

  async list(req: Request, res: Response) {
    const q = ListCommodityBidQuery.parse(req.query);
    res.json(await service.list(q, req.user!));
  },

  async timeline(req: Request, res: Response) {
    await loadAccessible(req);
    res.json(await service.timeline(req.params.id, req.query));
  },

  async nextActions(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    const ctx = await service.buildNextActionContext(ws as never, req.user!);
    res.json(computeCommodityBidNextActions(ctx));
  },

  async auctionStatus(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    const d = ws.commodityBidDetails;
    const now = Date.now();
    const ends = d?.auctionEndsAt?.getTime() ?? 0;
    const starts = d?.auctionStartsAt?.getTime() ?? 0;
    const lots = await prisma.commodityBidLot.findMany({
      where: { workspaceId: ws.id },
      select: { quantity: true },
    });
    const totalQuantity = lots.reduce((sum, l) => sum + Number(l.quantity), 0);
    const lowest = d?.lowestBidAmount != null ? Number(d.lowestBidAmount) : null;
    const bidEvents = await prisma.commodityBidBidEvent.findMany({
      where: { workspaceId: ws.id },
      select: { unitPrice: true },
      orderBy: { createdAt: "asc" },
    });
    const prices = bidEvents.map((e) => Number(e.unitPrice));
    const openingBidAmount = prices[0] ?? null;
    const highestBidAmount = prices.length > 0 ? Math.max(...prices) : null;
    let contractValue: number | null = null;
    let savingsAchieved: number | null = null;
    let savingsPercent: number | null = null;
    if (lowest != null && totalQuantity > 0) {
      contractValue = lowest * totalQuantity;
    }
    const reference = highestBidAmount ?? openingBidAmount;
    if (lowest != null && reference != null && reference > lowest && totalQuantity > 0) {
      savingsAchieved = (reference - lowest) * totalQuantity;
      savingsPercent = ((reference - lowest) / reference) * 100;
    }
    res.json({
      state: ws.state,
      auctionStartsAt: d?.auctionStartsAt?.toISOString() ?? null,
      auctionEndsAt: d?.auctionEndsAt?.toISOString() ?? null,
      secondsRemaining: ws.state === "LIVE" && ends > now ? Math.floor((ends - now) / 1000) : 0,
      secondsUntilStart: ["SCHEDULED", "INVITING_SUPPLIERS", "READY_TO_START"].includes(ws.state) && starts > now
        ? Math.floor((starts - now) / 1000) : 0,
      lowestBidAmount: lowest,
      contractValue,
      savingsAchieved,
      savingsPercent,
      openingBidAmount,
      highestBidAmount,
      totalQuantity,
    });
  },

  async bidFeed(req: Request, res: Response) {
    await loadAccessible(req);
    const events = await prisma.commodityBidBidEvent.findMany({
      where: { workspaceId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(events.map((e) => ({
      id: e.id,
      lotId: e.lotId,
      eventType: e.eventType,
      unitPrice: Number(e.unitPrice),
      createdAt: e.createdAt.toISOString(),
      bidderCode: "(anonymous)",
    })));
  },

  async participation(req: Request, res: Response) {
    await loadAccessible(req);
    const inv = await prisma.commodityBidInvitation.findMany({
      where: { workspaceId: req.params.id, removedAt: null },
      select: { bidderCode: true, status: true, viewedAt: true, acceptedAt: true, joinedAt: true },
    });
    res.json({
      invited: inv.length,
      joined: inv.filter((i) => i.joinedAt || i.status === "JOINED").length,
      suppliers: inv.map((row, index) => ({
        ...row,
        displayName: `Qualified Manufacturer #${index + 1}`,
      })),
    });
  },

  async analytics(req: Request, res: Response) {
    const auctions = await prisma.workspace.count({ where: { type: "COMMODITYBID" } });
    const completed = await prisma.workspace.count({ where: { type: "COMMODITYBID", state: { in: ["ORDERS_SPAWNED", "CLOSED", "WINNER_IDENTIFIED", "AWAITING_BUYER_APPROVAL", "APPROVED"] } } });
    const live = await prisma.workspace.count({ where: { type: "COMMODITYBID", state: "LIVE" } });
    const bids = await prisma.commodityBidBidEvent.count();
    const orders = await prisma.workspace.count({ where: { type: "ORDER", spawnedFromId: { not: null } } });
    res.json({
      auctionsCreated: auctions,
      auctionsCompleted: completed,
      auctionsLive: live,
      totalBids: bids,
      auctionToOrderConversion: auctions > 0 ? Math.round((orders / auctions) * 100) : 0,
      averageBidsPerAuction: auctions > 0 ? Math.round(bids / auctions) : 0,
    });
  },

  async adminIdentity(req: Request, res: Response) {
    if (!canViewSupplierIdentity(req.user!)) throw new AppError(403, "FORBIDDEN");
    await loadAccessible(req);
    res.json(await service.getAdminIdentityMap(req.params.id));
  },

  async ownBids(req: Request, res: Response) {
    await loadAccessible(req);
    res.json(await service.getOwnBids(req.params.id, req.user!));
  },

  async myAwards(req: Request, res: Response) {
    await loadAccessible(req);
    res.json(await service.getMyAwards(req.params.id, req.user!));
  },

  async spawnedOrders(req: Request, res: Response) {
    await loadAccessible(req);
    res.json(await service.getSpawnedOrders(req.params.id));
  },

  async adminQueue(req: Request, res: Response) {
    res.json(await service.adminQueue());
  },

  async runSchedulerTick(_req: Request, res: Response) {
    await runCommodityBidSchedulerTick();
    res.json({ ok: true });
  },

  action(action: CommodityBidAction) {
    return async (req: Request, res: Response) => {
      const env = ActionEnvelope.parse(req.body ?? {});
      const schema = PAYLOAD_SCHEMAS[action];
      const payload = schema ? schema.parse(env.payload ?? {}) : (env.payload ?? {});
      const ws = await loadAccessible(req);
      const lotId = req.params.lotId;
      const fullPayload = lotId ? { ...payload, lotId } : payload;

      const result = await service.applyTransition({
        workspaceId: ws.id,
        action,
        actor: { id: req.user!.id, email: req.user!.email, role: toActorRole(req.user!.role) },
        payload: fullPayload,
        idempotencyKey: env.idempotencyKey,
        reason: env.reason,
        requestContext: { ip: req.ip, userAgent: req.get("user-agent") },
      });
      res.json({ ok: true, ...result, workspace: await service.fetchDTO(ws.id, req.user!) });
    };
  },

  async submitBidLot(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    const raw = req.body?.payload ?? req.body ?? {};
    const body = SubmitBidLotPayload.parse(raw);
    const action = await service.prisma.commodityBidSubmission.findFirst({
      where: { lotId: req.params.lotId, supplierUserId: req.user!.id, withdrawnAt: null },
    });
    const act: CommodityBidAction = action ? "revise_bid_lot" : "submit_bid_lot";
    const currency = typeof raw.currency === "string" ? raw.currency : ws.currency;
    const result = await service.applyTransition({
      workspaceId: ws.id,
      action: act,
      actor: { id: req.user!.id, email: req.user!.email, role: toActorRole(req.user!.role) },
      payload: { ...body, lotId: req.params.lotId, currency },
    });
    res.json(result);
  },

  async withdrawBidLot(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    const body = WithdrawBidLotPayload.parse(req.body?.payload ?? req.body);
    const result = await service.applyTransition({
      workspaceId: ws.id,
      action: "withdraw_bid_lot",
      actor: { id: req.user!.id, email: req.user!.email, role: toActorRole(req.user!.role) },
      payload: { ...body, lotId: req.params.lotId },
    });
    res.json(result);
  },
};
