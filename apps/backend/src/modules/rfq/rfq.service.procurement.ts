/**
 * Sprint 11A — Procurement strategy selection + CommodityBid spawn from RFQ.
 */
import { Prisma } from "@prisma/client";
import type {
  SelectProcurementStrategyInput,
  SpawnCommodityBidFromRfqInput,
} from "@dmx/contracts/rfq.zod";
import { RfqService } from "./rfq.service.js";
import { CommodityBidService } from "../commoditybid/commoditybid.service.js";
import { AppError } from "../../utils/httpErrors.js";
import type { AuthUser } from "./rfq.policy.js";

declare module "./rfq.service" {
  interface RfqService {
    selectProcurementStrategy(
      wsId: string,
      input: SelectProcurementStrategyInput,
      actor: AuthUser,
    ): Promise<unknown>;
    spawnCommodityBidFromRfq(
      wsId: string,
      input: SpawnCommodityBidFromRfqInput,
      actor: AuthUser,
    ): Promise<{ rfq: unknown; commodityBid: unknown }>;
  }
}

async function nextCbRef(prisma: RfqService["prisma"]): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `CB-${year}-`;
  const last = await prisma.workspace.findFirst({
    where: { externalRef: { startsWith: prefix } },
    orderBy: { externalRef: "desc" },
    select: { externalRef: true },
  });
  const lastNum = last ? Number(last.externalRef.slice(prefix.length)) : 0;
  return `${prefix}${String(lastNum + 1).padStart(4, "0")}`;
}

RfqService.prototype.selectProcurementStrategy = async function (wsId, input, actor) {
  if (actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN_ROLE");
  const ws = await this.prisma.workspace.findUnique({
    where: { id: wsId },
    include: { rfqDetails: true },
  });
  if (!ws || ws.type !== "RFQ") throw new AppError(404, "RFQ_NOT_FOUND");
  if (ws.createdById !== actor.id) throw new AppError(403, "FORBIDDEN");
  if (ws.rfqDetails?.procurementMethod) throw new AppError(409, "PROCUREMENT_METHOD_ALREADY_SET");

  if (input.procurementMethod !== "DIRECT_RFQ") {
    throw new AppError(400, "USE_SPAWN_ENDPOINT_FOR_COMMODITYBID");
  }

  await this.prisma.$transaction(async (tx) => {
    await tx.rfqDetails.update({
      where: { workspaceId: wsId },
      data: { procurementMethod: "DIRECT_RFQ" },
    });
    await tx.timelineEvent.create({
      data: {
        workspaceId: wsId,
        eventType: "rfq.procurement.direct_selected",
        actorUserId: actor.id,
        payload: { procurementMethod: "DIRECT_RFQ" },
      },
    });
  });

  return this.fetchDTO(wsId);
};

RfqService.prototype.spawnCommodityBidFromRfq = async function (wsId, input, actor) {
  if (actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN_ROLE");
  const ws = await this.prisma.workspace.findUnique({
    where: { id: wsId },
    include: {
      rfqDetails: true,
      rfqLineItems: { orderBy: { position: "asc" } },
    },
  });
  if (!ws || ws.type !== "RFQ") throw new AppError(404, "RFQ_NOT_FOUND");
  if (ws.createdById !== actor.id) throw new AppError(403, "FORBIDDEN");
  if (ws.rfqDetails?.procurementMethod) throw new AppError(409, "PROCUREMENT_METHOD_ALREADY_SET");
  if (ws.rfqDetails?.linkedCommoditybidId) throw new AppError(409, "COMMODITYBID_ALREADY_LINKED");

  const d = ws.rfqDetails!;
  const cbService = new CommodityBidService(this.prisma);

  const cbId = await this.prisma.$transaction(async (tx) => {
    const externalRef = await nextCbRef(tx as RfqService["prisma"]);
    const auctionStartsAt = new Date(input.auctionStartsAt);
    const auctionEndsAt = new Date(auctionStartsAt.getTime() + input.auctionDurationMinutes * 60_000);

    const cbWs = await tx.workspace.create({
      data: {
        externalRef,
        type: "COMMODITYBID",
        state: "BID_DRAFT",
        currency: ws.currency,
        deadlineAt: auctionEndsAt,
        createdById: actor.id,
        spawnedFromId: wsId,
        commodityBidDetails: {
          create: {
            title: d.title,
            description: d.productDescription,
            productCategory: d.productCategory,
            targetMarket: d.targetMarket,
            auctionStartsAt,
            auctionEndsAt,
            auctionDurationMinutes: input.auctionDurationMinutes,
            invitationDeadlineAt: new Date(auctionStartsAt.getTime() - input.invitationDeadlineMinutes * 60_000),
            auctionRules: { supplierUserIds: input.supplierUserIds, sourceRfqId: wsId },
          },
        },
        commodityBidLots: {
          create: ws.rfqLineItems.map((li, i) => ({
            lotNumber: i + 1,
            commodity: li.description,
            quantity: new Prisma.Decimal(li.quantity),
            uom: li.uom,
            notes: li.notes,
          })),
        },
        participants: { create: [{ userId: actor.id, participantRole: "OWNER" }] },
      },
    });

    await tx.rfqDetails.update({
      where: { workspaceId: wsId },
      data: {
        procurementMethod: "COMMODITYBID_AUCTION",
        linkedCommoditybidId: cbWs.id,
      },
    });

    await tx.timelineEvent.create({
      data: {
        workspaceId: wsId,
        eventType: "rfq.procurement.auction_spawned",
        actorUserId: actor.id,
        payload: { commodityBidId: cbWs.id, procurementMethod: "COMMODITYBID_AUCTION" },
      },
    });
    await tx.timelineEvent.create({
      data: {
        workspaceId: cbWs.id,
        eventType: "bid.spawned_from_rfq",
        actorUserId: actor.id,
        payload: { rfqId: wsId, rfqRef: ws.externalRef },
      },
    });

    return cbWs.id;
  });

  await cbService.applyTransition({
    workspaceId: cbId,
    action: "schedule_auction",
    actor: { id: actor.id, email: actor.email, role: actor.role },
    payload: {
      auctionStartsAt: input.auctionStartsAt,
      auctionDurationMinutes: input.auctionDurationMinutes,
      invitationDeadlineMinutes: input.invitationDeadlineMinutes,
      supplierUserIds: input.supplierUserIds,
    },
  });

  const [rfq, commodityBid] = await Promise.all([
    this.fetchDTO(wsId),
    cbService.fetchDTO(cbId, actor),
  ]);

  return { rfq, commodityBid };
};
