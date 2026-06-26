import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  FreightEstimateDto,
  FreightEstimatePanelDto,
  FreightEstimateStatusDto,
} from "@dmx/contracts/freight-estimate";
import { FREIGHT_ESTIMATE_TIMELINE_EVENTS } from "@dmx/contracts/freight-estimate";
import type { CreateFreightEstimatePayload } from "@dmx/contracts/freight-estimate.zod";
import { AppError } from "../../utils/httpErrors.js";
import { resolveFreightRoute } from "../freightiq/commercial/freight-route.util.js";
import { canAccessFreightEstimate, type AuthUser } from "./freight-estimate.policy.js";

type Db = PrismaClient | Prisma.TransactionClient;

const ESTIMATE_TTL_DAYS = 7;
const EXPIRING_SOON_MS = 48 * 3_600_000;

const ROUTE_FREIGHT_USD: Record<string, number> = {
  "China→Netherlands": 2800,
  "China→USA": 3200,
  "China→UK": 2900,
  "Turkey→Netherlands": 1800,
  "Turkey→UAE": 1200,
  "Turkey→Nigeria": 2400,
  "Turkey→USA": 3500,
  "UAE→Netherlands": 2100,
  "UAE→Nigeria": 1900,
};

type TradeContext = {
  tradeId: string;
  supplierId: string;
  originPort: string;
  destinationPort: string;
  containerType: string;
  fobValue: number;
  currency: string;
};

function toDto(row: {
  id: string;
  tradeId: string;
  supplierId: string;
  originCountry: string;
  originPort: string;
  destinationCountry: string;
  destinationPort: string;
  containerType: string;
  fobValue: Prisma.Decimal;
  estimatedFreight: Prisma.Decimal;
  currency: string;
  estimatedCifValue: Prisma.Decimal;
  estimatedAt: Date;
  expiresAt: Date;
  lastRefreshedAt: Date | null;
  status: string;
}): FreightEstimateDto {
  return {
    id: row.id,
    tradeId: row.tradeId,
    supplierId: row.supplierId,
    originCountry: row.originCountry,
    originPort: row.originPort,
    destinationCountry: row.destinationCountry,
    destinationPort: row.destinationPort,
    containerType: row.containerType,
    fobValue: Number(row.fobValue),
    estimatedFreight: Number(row.estimatedFreight),
    currency: row.currency,
    estimatedCifValue: Number(row.estimatedCifValue),
    estimatedAt: row.estimatedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    status: row.status as FreightEstimateDto["status"],
    lastRefreshedAt: row.lastRefreshedAt?.toISOString() ?? null,
  };
}

function indicativeFreightUsd(route: string, containerType: string): number {
  const base = ROUTE_FREIGHT_USD[route] ?? 2500;
  const multiplier = containerType.includes("40") ? 1.55 : containerType.includes("LCL") ? 0.45 : 1;
  return Math.round(base * multiplier);
}

function expirationStatus(
  current: FreightEstimateDto | null,
): FreightEstimatePanelDto["expirationStatus"] {
  if (!current) return "NONE";
  if (current.status === "EXPIRED") return "EXPIRED";
  const ms = new Date(current.expiresAt).getTime() - Date.now();
  if (ms <= 0) return "EXPIRED";
  if (ms <= EXPIRING_SOON_MS) return "EXPIRING_SOON";
  return "ACTIVE";
}

async function appendTimeline(
  tx: Db,
  workspaceId: string,
  eventType: string,
  actorUserId: string | null,
  payload: Record<string, unknown>,
) {
  await tx.timelineEvent.create({
    data: { workspaceId, eventType, actorUserId, payload: payload as Prisma.InputJsonValue },
  });
}

export class FreightEstimateService {
  constructor(private readonly db: Db) {}

  async list(actor: AuthUser, query: { tradeId?: string; status?: string; limit?: number }) {
    const limit = query.limit ?? 50;
    const where: Prisma.FreightEstimateWhereInput = {};
    if (query.tradeId) {
      if (!(await canAccessFreightEstimate(this.db, actor, query.tradeId))) {
        throw new AppError(403, "FORBIDDEN");
      }
      where.tradeId = query.tradeId;
    } else if (actor.role === "BUYER") {
      const owned = await this.db.workspaceParticipant.findMany({
        where: { userId: actor.id, participantRole: "OWNER", leftAt: null },
        select: { workspaceId: true },
      });
      where.tradeId = { in: owned.map((o) => o.workspaceId) };
    } else if (actor.role === "SUPPLIER") {
      where.supplierId = actor.id;
    } else if (actor.role !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN");
    }
    if (query.status) where.status = query.status;

    const rows = await this.db.freightEstimate.findMany({
      where,
      orderBy: { estimatedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => this.mapForRole(actor, r));
  }

  async getById(actor: AuthUser, id: string) {
    const row = await this.db.freightEstimate.findUnique({ where: { id } });
    if (!row) throw new AppError(404, "FREIGHT_ESTIMATE_NOT_FOUND");
    if (!(await canAccessFreightEstimate(this.db, actor, row.tradeId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    return this.mapForRole(actor, row);
  }

  async getPanel(actor: AuthUser, tradeId: string): Promise<FreightEstimatePanelDto> {
    if (!(await canAccessFreightEstimate(this.db, actor, tradeId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    await this.expireStaleEstimates(tradeId);
    const rows = await this.db.freightEstimate.findMany({
      where: { tradeId },
      orderBy: { estimatedAt: "desc" },
      take: 20,
    });
    const dtos = rows.map((r) => toDto(r));
    const current = dtos.find((d) => d.status === "ACTIVE") ?? null;
    if (actor.role === "SUPPLIER") {
      return {
        current: null,
        history: [],
        expirationStatus: current ? expirationStatus(current) : "NONE",
        lastRefresh: current?.lastRefreshedAt ?? current?.estimatedAt ?? null,
      };
    }
    return {
      current,
      history: dtos.filter((d) => d.id !== current?.id),
      expirationStatus: expirationStatus(current),
      lastRefresh: current?.lastRefreshedAt ?? current?.estimatedAt ?? null,
    };
  }

  async create(actor: AuthUser, payload: CreateFreightEstimatePayload) {
    if (actor.role !== "BUYER" && actor.role !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN");
    }
    if (!(await canAccessFreightEstimate(this.db, actor, payload.tradeId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    const ctx = await this.resolveTradeContext(this.db, payload.tradeId, payload);
    return this.generateEstimate(this.db, actor, ctx, FREIGHT_ESTIMATE_TIMELINE_EVENTS.CREATED);
  }

  async refresh(actor: AuthUser, id: string) {
    const existing = await this.db.freightEstimate.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "FREIGHT_ESTIMATE_NOT_FOUND");
    if (!(await canAccessFreightEstimate(this.db, actor, existing.tradeId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    if (actor.role !== "BUYER" && actor.role !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN");
    }
    const ctx = await this.resolveTradeContext(this.db, existing.tradeId, {
      tradeId: existing.tradeId,
      supplierId: existing.supplierId,
      containerType: existing.containerType,
      originPort: existing.originPort,
      destinationPort: existing.destinationPort,
      fobValue: Number(existing.fobValue),
    });
    return this.generateEstimate(
      this.db,
      actor,
      ctx,
      FREIGHT_ESTIMATE_TIMELINE_EVENTS.UPDATED,
      existing.id,
    );
  }

  async assertActiveEstimateForPo(tradeId: string): Promise<FreightEstimateDto> {
    await this.expireStaleEstimates(tradeId);
    const active = await this.db.freightEstimate.findFirst({
      where: { tradeId, status: "ACTIVE", expiresAt: { gt: new Date() } },
      orderBy: { estimatedAt: "desc" },
    });
    if (!active) {
      throw new AppError(409, "FREIGHT_ESTIMATE_REQUIRED", {
        message: "An active FreightIQ estimate is required before Purchase Order approval.",
      });
    }
    return toDto(active);
  }

  async autoGenerateForTrade(
    db: Db,
    tradeId: string,
    actorUserId: string | null,
    overrides?: Partial<CreateFreightEstimatePayload>,
  ) {
    const ctx = await this.resolveTradeContext(db, tradeId, { tradeId, ...overrides });
    await this.generateEstimate(
      db,
      { id: actorUserId ?? "system", role: "SYSTEM", email: "system@demaxtore.local" },
      ctx,
      FREIGHT_ESTIMATE_TIMELINE_EVENTS.CREATED,
    );
  }

  async expireStaleEstimates(tradeId?: string) {
    const now = new Date();
    const where: Prisma.FreightEstimateWhereInput = {
      status: "ACTIVE",
      expiresAt: { lte: now },
    };
    if (tradeId) where.tradeId = tradeId;

    const stale = await this.db.freightEstimate.findMany({ where, take: 100 });
    for (const row of stale) {
      const expireOne = async (tx: Db) => {
        await tx.freightEstimate.update({
          where: { id: row.id },
          data: { status: "EXPIRED" },
        });
        await appendTimeline(tx, row.tradeId, FREIGHT_ESTIMATE_TIMELINE_EVENTS.EXPIRED, null, {
          estimateId: row.id,
        });
      };
      if ("$transaction" in this.db) {
        await this.db.$transaction((tx) => expireOne(tx));
      } else {
        await expireOne(this.db);
      }
    }
  }

  async countCifReadyForBuyer(buyerUserId: string): Promise<number> {
    const roots = await this.db.workspaceParticipant.findMany({
      where: {
        userId: buyerUserId,
        participantRole: "OWNER",
        leftAt: null,
        workspace: {
          type: { in: ["RFQ", "COMMODITYBID", "MIXED_CONTAINER", "BULK_CONTAINER"] },
          state: {
            in: [
              "SUPPLIER_SELECTED",
              "PROFORMA_REQUESTED",
              "PROFORMA_RECEIVED",
              "PROFORMA_APPROVED",
              "WINNER_IDENTIFIED",
              "AWAITING_BUYER_APPROVAL",
              "APPROVED",
              "MC_BUYER_REVIEW",
              "MC_APPROVED",
              "BC_BUYER_REVIEW",
              "BC_APPROVED",
            ],
          },
        },
      },
      select: { workspaceId: true },
    });
    let count = 0;
    for (const r of roots) {
      const active = await this.db.freightEstimate.findFirst({
        where: {
          tradeId: r.workspaceId,
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
      });
      if (active) count++;
    }
    return count;
  }

  buildTradePanel(panel: FreightEstimatePanelDto) {
    return {
      current: panel.current
        ? {
            id: panel.current.id,
            fobValue: panel.current.fobValue,
            estimatedFreight: panel.current.estimatedFreight,
            estimatedCifValue: panel.current.estimatedCifValue,
            currency: panel.current.currency,
            estimatedAt: panel.current.estimatedAt,
            expiresAt: panel.current.expiresAt,
            status: panel.current.status,
            lastRefreshedAt: panel.current.lastRefreshedAt,
          }
        : null,
      history: panel.history.map((h) => ({
        id: h.id,
        estimatedFreight: h.estimatedFreight,
        estimatedCifValue: h.estimatedCifValue,
        currency: h.currency,
        estimatedAt: h.estimatedAt,
        expiresAt: h.expiresAt,
        status: h.status,
      })),
      expirationStatus: panel.expirationStatus,
      lastRefresh: panel.lastRefresh,
    };
  }

  private mapForRole(
    actor: AuthUser,
    row: Parameters<typeof toDto>[0],
  ): FreightEstimateDto | FreightEstimateStatusDto {
    if (actor.role === "SUPPLIER") {
      return {
        id: row.id,
        tradeId: row.tradeId,
        status: row.status as FreightEstimateStatusDto["status"],
        expiresAt: row.expiresAt.toISOString(),
        estimatedAt: row.estimatedAt.toISOString(),
      };
    }
    return toDto(row);
  }

  private async resolveTradeContext(
    db: Db,
    tradeId: string,
    overrides: Partial<CreateFreightEstimatePayload>,
  ): Promise<TradeContext> {
    const wsRaw = await db.workspace.findUniqueOrThrow({
      where: { id: tradeId },
      include: {
        rfqDetails: true,
        mixedContainerDetails: true,
        bulkContainerDetails: true,
        quotations: { where: { withdrawnAt: null }, orderBy: { submittedAt: "desc" }, take: 5 },
        commodityBidAwards: { where: { status: "ACCEPTED" }, take: 1 },
        mcContainerOffers: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 1 },
        bcContainerOffers: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    const ws = wsRaw as typeof wsRaw & {
      rfqDetails: { selectedSupplierUserId: string | null; selectedQuotationId: string | null; targetMarket: string } | null;
      quotations: Array<{ id: string; supplierUserId: string; total: Prisma.Decimal | null }>;
      commodityBidAwards: Array<{ supplierUserId: string; submissionId: string }>;
      mcContainerOffers: Array<{ offerTotal: Prisma.Decimal | null }>;
      bcContainerOffers: Array<{ offerTotal: Prisma.Decimal }>;
      mixedContainerDetails: { containerType: string } | null;
      bulkContainerDetails: { containerType: string } | null;
    };

    let supplierId = overrides.supplierId;
    let fobValue = overrides.fobValue;
    let originPort = overrides.originPort ?? "CNSHA";
    let destinationPort = overrides.destinationPort ?? "NLRTM";
    let containerType = overrides.containerType ?? "20GP";
    const currency = ws.currency ?? "USD";

    if (ws.type === "RFQ" && ws.rfqDetails) {
      supplierId = supplierId ?? ws.rfqDetails.selectedSupplierUserId ?? undefined;
      const q = ws.rfqDetails.selectedQuotationId
        ? ws.quotations.find((x) => x.id === ws.rfqDetails!.selectedQuotationId)
        : ws.quotations.find((x) => x.supplierUserId === supplierId);
      if (q?.total != null) fobValue = fobValue ?? Number(q.total);
      destinationPort = overrides.destinationPort ?? ws.rfqDetails.targetMarket?.slice(0, 20) ?? destinationPort;
    }

    if (ws.type === "COMMODITYBID") {
      const award = ws.commodityBidAwards[0];
      if (award) {
        supplierId = supplierId ?? award.supplierUserId;
        const sub = await db.commodityBidSubmission.findUnique({
          where: { id: award.submissionId },
          include: { lot: true },
        });
        if (sub) {
          fobValue = fobValue ?? Number(sub.unitPrice) * Number(sub.lot.quantity);
        }
      }
    }

    if (ws.type === "MIXED_CONTAINER") {
      const offer = ws.mcContainerOffers[0];
      if (offer?.offerTotal != null) {
        fobValue = fobValue ?? Number(offer.offerTotal);
        containerType = overrides.containerType ?? ws.mixedContainerDetails?.containerType ?? "20GP";
      }
      supplierId = supplierId ?? ws.createdById;
    }

    if (ws.type === "BULK_CONTAINER") {
      const offer = ws.bcContainerOffers[0];
      if (offer) {
        fobValue = fobValue ?? Number(offer.offerTotal);
        containerType = overrides.containerType ?? ws.bulkContainerDetails?.containerType ?? "20GP";
      }
      supplierId = supplierId ?? ws.createdById;
    }

    if (!supplierId) throw new AppError(409, "MANUFACTURER_NOT_SELECTED");
    if (fobValue == null || fobValue <= 0) throw new AppError(409, "FOB_VALUE_UNAVAILABLE");

    return { tradeId, supplierId, originPort, destinationPort, containerType, fobValue, currency };
  }

  private async generateEstimate(
    db: Db,
    actor: AuthUser,
    ctx: TradeContext,
    eventType: string,
    refreshFromId?: string,
  ): Promise<FreightEstimateDto> {
    const routeInfo = resolveFreightRoute(ctx.originPort, ctx.destinationPort);
    const estimatedFreight = indicativeFreightUsd(routeInfo.lane, ctx.containerType);
    const estimatedCifValue = ctx.fobValue + estimatedFreight;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ESTIMATE_TTL_DAYS * 86_400_000);

    const run = async (tx: Db) => {
      await tx.freightEstimate.updateMany({
        where: { tradeId: ctx.tradeId, status: "ACTIVE" },
        data: { status: "SUPERSEDED" },
      });

      const row = await tx.freightEstimate.create({
        data: {
          tradeId: ctx.tradeId,
          supplierId: ctx.supplierId,
          originCountry: routeInfo.countryFrom,
          originPort: routeInfo.pol,
          destinationCountry: routeInfo.countryTo,
          destinationPort: routeInfo.pod,
          containerType: ctx.containerType,
          fobValue: ctx.fobValue,
          estimatedFreight,
          currency: ctx.currency,
          estimatedCifValue,
          estimatedAt: now,
          expiresAt,
          lastRefreshedAt: refreshFromId ? now : null,
          status: "ACTIVE",
        },
      });

      await appendTimeline(tx, ctx.tradeId, eventType, actor.id === "system" ? null : actor.id, {
        estimateId: row.id,
        fobValue: ctx.fobValue,
        estimatedFreight,
        estimatedCifValue,
        refreshedFrom: refreshFromId ?? null,
      });

      return toDto(row);
    };

    if ("$transaction" in db) {
      return db.$transaction((tx) => run(tx));
    }
    return run(db);
  }
}

export async function autoGenerateFreightEstimateInTx(
  tx: Db,
  tradeId: string,
  actorUserId: string | null,
  overrides?: Partial<CreateFreightEstimatePayload>,
) {
  await new FreightEstimateService(tx).autoGenerateForTrade(tx, tradeId, actorUserId, overrides);
}
