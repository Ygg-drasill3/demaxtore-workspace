import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  CargoReadyForecastDto,
  CarrierOptionDto,
  FreightBookingDto,
  FreightBookingKpiDto,
  FreightBookingPanelDto,
  FreightBookingSupplierPanelDto,
} from "@dmx/contracts/freight-booking";
import { FREIGHT_BOOKING_TIMELINE_EVENTS } from "@dmx/contracts/freight-booking";
import type {
  CreateFreightBookingPayload,
  SelectCarrierOptionPayload,
} from "@dmx/contracts/freight-booking.zod";
import { AppError } from "../../utils/httpErrors.js";
import {
  canAccessFreightBooking,
  canConfirmBooking,
  canManageFreightBooking,
  canSelectCarrier,
  canSubmitForecast,
  type AuthUser,
} from "./freight-booking.policy.js";

type Db = PrismaClient | Prisma.TransactionClient;

const SCORE_WEIGHTS = { cost: 0.4, transit: 0.3, cutoff: 0.3 };

const CARRIER_TEMPLATES = [
  { carrier: "Maersk", vessel: "MAERSK ESSEX", freightMul: 1.0, transitDays: 28, cutoffOffsetDays: 5 },
  { carrier: "MSC", vessel: "MSC GULSUN", freightMul: 0.92, transitDays: 32, cutoffOffsetDays: 7 },
  { carrier: "CMA CGM", vessel: "CMA CGM MARCO POLO", freightMul: 0.88, transitDays: 35, cutoffOffsetDays: 4 },
  { carrier: "Hapag-Lloyd", vessel: "BERLIN EXPRESS", freightMul: 0.95, transitDays: 30, cutoffOffsetDays: 6 },
];

function toForecastDto(row: {
  id: string;
  tradeId: string;
  supplierId: string;
  freightBookingId: string | null;
  productionStartDate: Date;
  estimatedProductionFinishDate: Date;
  estimatedCargoReadyDate: Date;
  confidenceLevel: string;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): CargoReadyForecastDto {
  return {
    id: row.id,
    tradeId: row.tradeId,
    supplierId: row.supplierId,
    freightBookingId: row.freightBookingId,
    productionStartDate: row.productionStartDate.toISOString(),
    estimatedProductionFinishDate: row.estimatedProductionFinishDate.toISOString(),
    estimatedCargoReadyDate: row.estimatedCargoReadyDate.toISOString(),
    confidenceLevel: row.confidenceLevel as CargoReadyForecastDto["confidenceLevel"],
    notes: row.notes,
    status: row.status as CargoReadyForecastDto["status"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toCarrierDto(row: {
  id: string;
  tradeId: string;
  freightBookingId: string;
  carrierName: string;
  vesselName: string;
  originPort: string;
  destinationPort: string;
  etd: Date;
  eta: Date;
  transitDays: number;
  cutoffDate: Date;
  freightAmount: Prisma.Decimal;
  currency: string;
  recommendationScore: Prisma.Decimal;
  status: string;
}): CarrierOptionDto {
  return {
    id: row.id,
    tradeId: row.tradeId,
    freightBookingId: row.freightBookingId,
    carrierName: row.carrierName,
    vesselName: row.vesselName,
    originPort: row.originPort,
    destinationPort: row.destinationPort,
    etd: row.etd.toISOString(),
    eta: row.eta.toISOString(),
    transitDays: row.transitDays,
    cutoffDate: row.cutoffDate.toISOString(),
    freightAmount: Number(row.freightAmount),
    currency: row.currency,
    recommendationScore: Number(row.recommendationScore),
    status: row.status as CarrierOptionDto["status"],
  };
}

function toBookingDto(row: {
  id: string;
  tradeId: string;
  supplierId: string;
  status: string;
  selectedCarrierOptionId: string | null;
  approvedAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): FreightBookingDto {
  return {
    id: row.id,
    tradeId: row.tradeId,
    supplierId: row.supplierId,
    status: row.status as FreightBookingDto["status"],
    selectedCarrierOptionId: row.selectedCarrierOptionId,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
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

function scoreCarrierOptions(
  options: Array<{ freightAmount: number; transitDays: number; cutoffDate: Date }>,
  cargoReadyDate: Date,
): number[] {
  if (options.length === 0) return [];
  const costs = options.map((o) => o.freightAmount);
  const transits = options.map((o) => o.transitDays);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const minTransit = Math.min(...transits);
  const maxTransit = Math.max(...transits);
  const cargoMs = cargoReadyDate.getTime();

  return options.map((o) => {
    const costScore = maxCost === minCost ? 100 : (100 * (maxCost - o.freightAmount)) / (maxCost - minCost);
    const transitScore = maxTransit === minTransit ? 100 : (100 * (maxTransit - o.transitDays)) / (maxTransit - minTransit);
    const bufferDays = (o.cutoffDate.getTime() - cargoMs) / 86_400_000;
    const cutoffScore = bufferDays <= 0 ? 0 : Math.min(100, bufferDays * 20);
    return Math.round(costScore * SCORE_WEIGHTS.cost + transitScore * SCORE_WEIGHTS.transit + cutoffScore * SCORE_WEIGHTS.cutoff);
  });
}

export class FreightBookingEngineService {
  constructor(private readonly db: Db) {}

  async list(actor: AuthUser, query: { tradeId?: string; status?: string; limit?: number }) {
    const limit = query.limit ?? 50;
    const where: Prisma.FreightBookingWhereInput = {};
    if (query.tradeId) {
      if (!(await canAccessFreightBooking(this.db, actor, query.tradeId))) {
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

    const rows = await this.db.freightBooking.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    return rows.map((r) => toBookingDto(r));
  }

  async getById(actor: AuthUser, id: string) {
    const row = await this.db.freightBooking.findUnique({
      where: { id },
      include: { carrierOptions: true },
    });
    if (!row) throw new AppError(404, "FREIGHT_BOOKING_NOT_FOUND");
    if (!(await canAccessFreightBooking(this.db, actor, row.tradeId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    return {
      booking: toBookingDto(row),
      carrierOptions: row.carrierOptions.map((o) => this.mapCarrierForRole(actor, o)),
    };
  }

  async getPanel(actor: AuthUser, tradeId: string): Promise<FreightBookingPanelDto | FreightBookingSupplierPanelDto> {
    if (!(await canAccessFreightBooking(this.db, actor, tradeId))) {
      throw new AppError(403, "FORBIDDEN");
    }

    const forecast = await this.db.cargoReadyForecast.findFirst({
      where: { tradeId, status: { in: ["ACTIVE", "REVISED"] } },
      orderBy: { updatedAt: "desc" },
    });
    const booking = await this.db.freightBooking.findFirst({
      where: { tradeId, status: { notIn: ["REBOOKED"] } },
      orderBy: { createdAt: "desc" },
      include: { carrierOptions: { orderBy: { recommendationScore: "desc" } } },
    });

    if (actor.role === "SUPPLIER") {
      const selected = booking?.selectedCarrierOptionId
        ? booking.carrierOptions.find((o) => o.id === booking.selectedCarrierOptionId)
        : null;
      return {
        forecast: forecast ? toForecastDto(forecast) : null,
        bookingStatus: (booking?.status as FreightBookingSupplierPanelDto["bookingStatus"]) ?? null,
        selectedCarrierName: selected?.carrierName ?? null,
        selectedVesselName: selected?.vesselName ?? null,
        selectedTransitDays: selected?.transitDays ?? null,
      };
    }

    const options = booking?.carrierOptions.map((o) => toCarrierDto(o)) ?? [];
    const recommended = options.find((o) => o.status === "RECOMMENDED") ?? options[0] ?? null;
    const selected = booking?.selectedCarrierOptionId
      ? options.find((o) => o.id === booking.selectedCarrierOptionId) ?? null
      : null;

    return {
      forecast: forecast ? toForecastDto(forecast) : null,
      booking: booking ? toBookingDto(booking) : null,
      carrierOptions: options,
      recommendedOption: recommended,
      selectedOption: selected,
      bestOverallLabel: recommended ? "Best Overall Option" : null,
    };
  }

  async create(actor: AuthUser, payload: CreateFreightBookingPayload) {
    if (!(await canAccessFreightBooking(this.db, actor, payload.tradeId))) {
      throw new AppError(403, "FORBIDDEN");
    }

    const ctx = await this.resolveTradeContext(payload.tradeId);

    if (payload.createPlan) {
      if (!canManageFreightBooking(actor) && actor.role !== "BUYER") {
        throw new AppError(403, "FORBIDDEN");
      }
      return this.createBookingPlan(actor, payload, ctx);
    }

    if (!canSubmitForecast(actor)) throw new AppError(403, "FORBIDDEN");
    return this.submitForecast(actor, payload, ctx.supplierId);
  }

  async selectCarrier(actor: AuthUser, bookingId: string, payload: SelectCarrierOptionPayload) {
    if (!canSelectCarrier(actor)) throw new AppError(403, "FORBIDDEN");

    const booking = await this.db.freightBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new AppError(404, "FREIGHT_BOOKING_NOT_FOUND");
    if (!(await canAccessFreightBooking(this.db, actor, booking.tradeId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    if (!["PLANNING", "UNDER_REVIEW", "REBOOK_REQUIRED"].includes(booking.status)) {
      throw new AppError(409, "BOOKING_NOT_SELECTABLE");
    }

    const option = await this.db.carrierOption.findFirst({
      where: { id: payload.carrierOptionId, freightBookingId: bookingId },
    });
    if (!option) throw new AppError(404, "CARRIER_OPTION_NOT_FOUND");
    if (option.status === "EXPIRED") throw new AppError(409, "CARRIER_OPTION_EXPIRED");

    const run = async (tx: Db) => {
      await tx.carrierOption.updateMany({
        where: { freightBookingId: bookingId, status: { in: ["AVAILABLE", "RECOMMENDED", "SELECTED"] } },
        data: { status: "AVAILABLE" },
      });
      await tx.carrierOption.update({
        where: { id: option.id },
        data: { status: "SELECTED" },
      });
      const updated = await tx.freightBooking.update({
        where: { id: bookingId },
        data: {
          selectedCarrierOptionId: option.id,
          status: "APPROVED",
          approvedAt: new Date(),
        },
      });
      await appendTimeline(tx, booking.tradeId, FREIGHT_BOOKING_TIMELINE_EVENTS.OPTION_SELECTED, actor.id, {
        bookingId,
        carrierOptionId: option.id,
        carrierName: option.carrierName,
      });
      return toBookingDto(updated);
    };

    if ("$transaction" in this.db) {
      return this.db.$transaction((tx) => run(tx));
    }
    return run(this.db);
  }

  async confirm(actor: AuthUser, bookingId: string) {
    if (!canConfirmBooking(actor)) throw new AppError(403, "FORBIDDEN");

    const booking = await this.db.freightBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new AppError(404, "FREIGHT_BOOKING_NOT_FOUND");
    if (booking.status !== "APPROVED") throw new AppError(409, "BOOKING_NOT_APPROVED");
    if (!booking.selectedCarrierOptionId) throw new AppError(409, "NO_CARRIER_SELECTED");

    const run = async (tx: Db) => {
      const updated = await tx.freightBooking.update({
        where: { id: bookingId },
        data: { status: "BOOKED", confirmedAt: new Date() },
      });
      await appendTimeline(tx, booking.tradeId, FREIGHT_BOOKING_TIMELINE_EVENTS.CONFIRMED, actor.id, {
        bookingId,
        carrierOptionId: booking.selectedCarrierOptionId,
      });
      return toBookingDto(updated);
    };

    if ("$transaction" in this.db) {
      return this.db.$transaction((tx) => run(tx));
    }
    return run(this.db);
  }

  async countKpis(): Promise<FreightBookingKpiDto> {
    const now = new Date();
    const cutoffRiskCutoff = new Date(now.getTime() + 3 * 86_400_000);

    const [bookingsPending, bookingsConfirmed, rebookRequired, forecastChanges] = await Promise.all([
      this.db.freightBooking.count({
        where: { status: { in: ["PLANNING", "UNDER_REVIEW", "APPROVED", "REBOOK_REQUIRED"] } },
      }),
      this.db.freightBooking.count({ where: { status: "BOOKED" } }),
      this.db.freightBooking.count({ where: { status: "REBOOK_REQUIRED" } }),
      this.db.cargoReadyForecast.count({ where: { status: "REVISED", updatedAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
    ]);

    const atRisk = await this.db.carrierOption.count({
      where: {
        status: { in: ["AVAILABLE", "RECOMMENDED", "SELECTED"] },
        cutoffDate: { lte: cutoffRiskCutoff },
        freightBooking: { status: { in: ["UNDER_REVIEW", "APPROVED", "REBOOK_REQUIRED"] } },
      },
    });

    return {
      bookingsPending,
      bookingsConfirmed,
      cutoffRisks: atRisk,
      forecastChanges,
      rebookRequired,
    };
  }

  buildTradePanel(panel: FreightBookingPanelDto | FreightBookingSupplierPanelDto) {
    if (!("carrierOptions" in panel)) {
      return {
        forecast: panel.forecast
          ? {
              productionStartDate: panel.forecast.productionStartDate,
              estimatedProductionFinishDate: panel.forecast.estimatedProductionFinishDate,
              estimatedCargoReadyDate: panel.forecast.estimatedCargoReadyDate,
              confidenceLevel: panel.forecast.confidenceLevel,
              status: panel.forecast.status,
            }
          : null,
        bookingStatus: panel.bookingStatus,
        carrierOptions: [],
        recommendedCarrier: null,
        selectedCarrier: panel.selectedCarrierName
          ? {
              carrierName: panel.selectedCarrierName,
              vesselName: panel.selectedVesselName ?? "—",
              transitDays: panel.selectedTransitDays ?? 0,
            }
          : null,
        bestOverallLabel: null,
      };
    }
    return {
      forecast: panel.forecast
        ? {
            productionStartDate: panel.forecast.productionStartDate,
            estimatedProductionFinishDate: panel.forecast.estimatedProductionFinishDate,
            estimatedCargoReadyDate: panel.forecast.estimatedCargoReadyDate,
            confidenceLevel: panel.forecast.confidenceLevel,
            status: panel.forecast.status,
          }
        : null,
      bookingStatus: panel.booking?.status ?? null,
      carrierOptions: panel.carrierOptions.map((o) => ({
        id: o.id,
        carrierName: o.carrierName,
        vesselName: o.vesselName,
        transitDays: o.transitDays,
        etd: o.etd,
        eta: o.eta,
        cutoffDate: o.cutoffDate,
        freightAmount: o.freightAmount,
        currency: o.currency,
        recommendationScore: o.recommendationScore,
        status: o.status,
      })),
      recommendedCarrier: panel.recommendedOption
        ? {
            carrierName: panel.recommendedOption.carrierName,
            vesselName: panel.recommendedOption.vesselName,
            recommendationScore: panel.recommendedOption.recommendationScore,
          }
        : null,
      selectedCarrier: panel.selectedOption
        ? {
            carrierName: panel.selectedOption.carrierName,
            vesselName: panel.selectedOption.vesselName,
            transitDays: panel.selectedOption.transitDays,
          }
        : null,
      bestOverallLabel: panel.bestOverallLabel,
    };
  }

  private mapCarrierForRole(actor: AuthUser, row: Parameters<typeof toCarrierDto>[0]) {
    if (actor.role === "SUPPLIER") {
      return {
        id: row.id,
        carrierName: row.carrierName,
        vesselName: row.vesselName,
        etd: row.etd.toISOString(),
        eta: row.eta.toISOString(),
        transitDays: row.transitDays,
        cutoffDate: row.cutoffDate.toISOString(),
        status: row.status,
      };
    }
    return toCarrierDto(row);
  }

  private async resolveTradeContext(tradeId: string) {
    const ws = await this.db.workspace.findUniqueOrThrow({
      where: { id: tradeId },
      include: {
        rfqDetails: true,
        freightEstimates: { where: { status: "ACTIVE" }, orderBy: { estimatedAt: "desc" }, take: 1 },
        spawnedChildren: { where: { type: "ORDER" }, take: 1 },
      },
    });

    const poReadyStates = ["PO_ISSUED", "CLOSED"];
    const hasOrder = ws.spawnedChildren.length > 0;
    if (!poReadyStates.includes(ws.state) && !hasOrder) {
      throw new AppError(409, "PO_REQUIRED_FOR_BOOKING");
    }

    const supplierId = ws.rfqDetails?.selectedSupplierUserId
      ?? ws.freightEstimates[0]?.supplierId
      ?? ws.createdById;

    const estimate = ws.freightEstimates[0];
    return {
      supplierId,
      originPort: estimate?.originPort ?? "CNSHA",
      destinationPort: estimate?.destinationPort ?? "NLRTM",
      currency: ws.currency ?? estimate?.currency ?? "USD",
      baseFreight: estimate ? Number(estimate.estimatedFreight) : 2800,
    };
  }

  private async submitForecast(actor: AuthUser, payload: CreateFreightBookingPayload, supplierId: string) {
    if (!payload.productionStartDate || !payload.estimatedProductionFinishDate || !payload.estimatedCargoReadyDate) {
      throw new AppError(400, "FORECAST_DATES_REQUIRED");
    }
    if (actor.role === "SUPPLIER" && actor.id !== supplierId) {
      throw new AppError(403, "FORBIDDEN");
    }

    const productionStartDate = new Date(payload.productionStartDate);
    const estimatedProductionFinishDate = new Date(payload.estimatedProductionFinishDate);
    const estimatedCargoReadyDate = new Date(payload.estimatedCargoReadyDate);

    const existing = await this.db.cargoReadyForecast.findFirst({
      where: { tradeId: payload.tradeId, status: "ACTIVE" },
    });

    const run = async (tx: Db) => {
      if (existing) {
        await tx.cargoReadyForecast.update({
          where: { id: existing.id },
          data: { status: "REVISED" },
        });
        const booked = await tx.freightBooking.findFirst({
          where: { tradeId: payload.tradeId, status: "BOOKED" },
        });
        if (booked) {
          await tx.freightBooking.update({
            where: { id: booked.id },
            data: { status: "REBOOK_REQUIRED" },
          });
          await appendTimeline(tx, payload.tradeId, FREIGHT_BOOKING_TIMELINE_EVENTS.REBOOK_REQUIRED, actor.id, {
            bookingId: booked.id,
            reason: "forecast_revised",
          });
        }
      }

      const forecast = await tx.cargoReadyForecast.create({
        data: {
          tradeId: payload.tradeId,
          supplierId,
          productionStartDate,
          estimatedProductionFinishDate,
          estimatedCargoReadyDate,
          confidenceLevel: payload.confidenceLevel ?? "MEDIUM",
          notes: payload.notes ?? null,
          status: "ACTIVE",
        },
      });
      return toForecastDto(forecast);
    };

    if ("$transaction" in this.db) {
      return this.db.$transaction((tx) => run(tx));
    }
    return run(this.db);
  }

  private async createBookingPlan(
    actor: AuthUser,
    payload: CreateFreightBookingPayload,
    ctx: Awaited<ReturnType<typeof this.resolveTradeContext>>,
  ) {
    let forecast = await this.db.cargoReadyForecast.findFirst({
      where: { tradeId: payload.tradeId, status: { in: ["ACTIVE", "REVISED"] } },
      orderBy: { updatedAt: "desc" },
    });

    if (!forecast) {
      if (!payload.productionStartDate || !payload.estimatedProductionFinishDate || !payload.estimatedCargoReadyDate) {
        throw new AppError(409, "FORECAST_REQUIRED");
      }
      forecast = await this.db.cargoReadyForecast.create({
        data: {
          tradeId: payload.tradeId,
          supplierId: ctx.supplierId,
          productionStartDate: new Date(payload.productionStartDate),
          estimatedProductionFinishDate: new Date(payload.estimatedProductionFinishDate),
          estimatedCargoReadyDate: new Date(payload.estimatedCargoReadyDate),
          confidenceLevel: payload.confidenceLevel ?? "MEDIUM",
          notes: payload.notes ?? null,
          status: "ACTIVE",
        },
      });
    }

    const priorBooked = await this.db.freightBooking.findFirst({
      where: { tradeId: payload.tradeId, status: "BOOKED" },
    });

    const run = async (tx: Db) => {
      if (priorBooked) {
        await tx.freightBooking.update({
          where: { id: priorBooked.id },
          data: { status: "REBOOKED" },
        });
        await appendTimeline(tx, payload.tradeId, FREIGHT_BOOKING_TIMELINE_EVENTS.REBOOKED, actor.id, {
          priorBookingId: priorBooked.id,
        });
      }

      const booking = await tx.freightBooking.create({
        data: {
          tradeId: payload.tradeId,
          supplierId: ctx.supplierId,
          status: "PLANNING",
        },
      });

      await tx.cargoReadyForecast.update({
        where: { id: forecast!.id },
        data: { freightBookingId: booking.id, status: "ACTIVE" },
      });

      const cargoReady = forecast!.estimatedCargoReadyDate;
      const optionDrafts = CARRIER_TEMPLATES.map((t) => {
        const etd = new Date(cargoReady.getTime() + 7 * 86_400_000);
        const eta = new Date(etd.getTime() + t.transitDays * 86_400_000);
        const cutoffDate = new Date(cargoReady.getTime() - t.cutoffOffsetDays * 86_400_000);
        return {
          tradeId: payload.tradeId,
          freightBookingId: booking.id,
          carrierName: t.carrier,
          vesselName: t.vessel,
          originPort: ctx.originPort,
          destinationPort: ctx.destinationPort,
          etd,
          eta,
          transitDays: t.transitDays,
          cutoffDate,
          freightAmount: Math.round(ctx.baseFreight * t.freightMul),
          currency: ctx.currency,
        };
      });

      const scores = scoreCarrierOptions(
        optionDrafts.map((o) => ({ freightAmount: o.freightAmount, transitDays: o.transitDays, cutoffDate: o.cutoffDate })),
        cargoReady,
      );

      let bestIdx = 0;
      let bestScore = -1;
      const createdOptions: CarrierOptionDto[] = [];

      for (let i = 0; i < optionDrafts.length; i++) {
        const score = scores[i] ?? 0;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
        const row = await tx.carrierOption.create({
          data: {
            ...optionDrafts[i],
            freightAmount: optionDrafts[i].freightAmount,
            recommendationScore: score,
            status: "AVAILABLE",
          },
        });
        createdOptions.push(toCarrierDto(row));
        await appendTimeline(tx, payload.tradeId, FREIGHT_BOOKING_TIMELINE_EVENTS.OPTION_ADDED, actor.id, {
          bookingId: booking.id,
          carrierOptionId: row.id,
          carrierName: row.carrierName,
          score,
        });
      }

      await tx.carrierOption.update({
        where: { id: createdOptions[bestIdx].id },
        data: { status: "RECOMMENDED" },
      });
      createdOptions[bestIdx] = { ...createdOptions[bestIdx], status: "RECOMMENDED" };

      const updated = await tx.freightBooking.update({
        where: { id: booking.id },
        data: { status: "UNDER_REVIEW" },
      });

      await appendTimeline(tx, payload.tradeId, FREIGHT_BOOKING_TIMELINE_EVENTS.PLAN_CREATED, actor.id, {
        bookingId: booking.id,
        optionCount: createdOptions.length,
      });

      return {
        booking: toBookingDto(updated),
        forecast: toForecastDto(forecast!),
        carrierOptions: createdOptions,
        recommendedOption: createdOptions[bestIdx],
      };
    };

    if ("$transaction" in this.db) {
      return this.db.$transaction((tx) => run(tx));
    }
    return run(this.db);
  }
}

export { scoreCarrierOptions, SCORE_WEIGHTS };
