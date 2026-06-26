import { Prisma, PrismaClient } from "@prisma/client";
import {
  MC_CONTAINER_CAPACITIES,
  findMcTransition,
  type MixedContainerAction,
  type MixedContainerState,
} from "@dmx/contracts/mixed-container.fsm";
import type {
  AddContainerLineInput,
  CreateMixedContainerInput,
  UpdateContainerLineInput,
  UpdateMixedContainerInput,
} from "@dmx/contracts/mixed-container.zod";
import { AppError } from "../../utils/httpErrors.js";
import type { AuthUser } from "./mixed-container.policy.js";
import { assertCanAccessMixedContainer } from "./mixed-container.policy.js";
import {
  assertLinesHavePackingType,
  assertValidPackingTypeForProduct,
} from "../packing-type/packing-type.helpers.js";

const WS_INCLUDE = {
  mixedContainerDetails: true,
  containerLines: {
    where: { removedAt: null },
    orderBy: { sortOrder: "asc" as const },
    include: {
      catalogProduct: { include: { category: true } },
      packingType: true,
    },
  },
  createdBy: { select: { displayName: true } },
};

type WsFull = Prisma.WorkspaceGetPayload<{ include: typeof WS_INCLUDE }>;

function num(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  return Number(v);
}

function lineValues(line: { palletCount: number; indicativeUnitLow: Prisma.Decimal | null; indicativeUnitMid: Prisma.Decimal | null; indicativeUnitHigh: Prisma.Decimal | null }) {
  const low = num(line.indicativeUnitLow);
  const mid = num(line.indicativeUnitMid);
  const high = num(line.indicativeUnitHigh);
  return {
    lineValueMin: low != null ? low * line.palletCount : mid != null ? mid * line.palletCount : null,
    lineValueMax: high != null ? high * line.palletCount : mid != null ? mid * line.palletCount : null,
  };
}

export function toMixedContainerDTO(ws: WsFull) {
  const d = ws.mixedContainerDetails!;
  const lines = (ws.containerLines ?? []).map((l) => {
    const vals = lineValues(l);
    return {
      id: l.id,
      catalogProductId: l.catalogProductId,
      packingTypeId: l.packingTypeId,
      packingTypeName: l.packingType.name,
      packingTypeCode: l.packingType.code,
      productRef: l.catalogProduct.productRef,
      name: l.catalogProduct.name,
      category: l.catalogProduct.category.name,
      packagingDescription: l.catalogProduct.packagingDescription,
      palletCount: l.palletCount,
      moqPallets: l.catalogProduct.moqPallets,
      indicativeUnitLow: num(l.indicativeUnitLow),
      indicativeUnitMid: num(l.indicativeUnitMid),
      indicativeUnitHigh: num(l.indicativeUnitHigh),
      ...vals,
    };
  });
  const currentPalletCount = lines.reduce((s, l) => s + l.palletCount, 0);
  const estValueMin = lines.reduce((s, l) => s + (l.lineValueMin ?? 0), 0) || null;
  const estValueMax = lines.reduce((s, l) => s + (l.lineValueMax ?? 0), 0) || null;
  const fillPercent = d.maxPalletCapacity > 0 ? Math.round((currentPalletCount / d.maxPalletCapacity) * 100) : 0;

  return {
    id: ws.id,
    externalRef: ws.externalRef,
    state: ws.state,
    containerType: d.containerType,
    maxPalletCapacity: d.maxPalletCapacity,
    currentPalletCount,
    remainingPallets: Math.max(0, d.maxPalletCapacity - currentPalletCount),
    fillPercent,
    destinationMarket: d.destinationMarket,
    currency: d.currency,
    estValueMin: lines.length ? estValueMin : null,
    estValueMax: lines.length ? estValueMax : null,
    ownerUserId: ws.createdById,
    ownerName: ws.createdBy?.displayName ?? "",
    productCount: lines.length,
    lines,
    pricingRequestedAt: d.pricingRequestedAt?.toISOString() ?? null,
    activeOfferId: d.activeOfferId ?? null,
    buyerNotes: d.buyerNotes ?? null,
    createdAt: ws.createdAt.toISOString(),
    updatedAt: ws.updatedAt.toISOString(),
  };
}

async function nextMcRef(prisma: Prisma.TransactionClient | PrismaClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `MC-${year}-`;
  const last = await prisma.workspace.findFirst({
    where: { externalRef: { startsWith: prefix } },
    orderBy: { externalRef: "desc" },
    select: { externalRef: true },
  });
  const n = last ? Number(last.externalRef.slice(prefix.length)) : 0;
  return `${prefix}${String(n + 1).padStart(5, "0")}`;
}

async function recalcDetails(tx: Prisma.TransactionClient, workspaceId: string) {
  const lines = await tx.containerLine.findMany({
    where: { workspaceId, removedAt: null },
    select: { palletCount: true, indicativeUnitLow: true, indicativeUnitMid: true, indicativeUnitHigh: true },
  });
  const currentPalletCount = lines.reduce((s, l) => s + l.palletCount, 0);
  let estMin = 0;
  let estMax = 0;
  for (const l of lines) {
    const low = num(l.indicativeUnitLow);
    const mid = num(l.indicativeUnitMid);
    const high = num(l.indicativeUnitHigh);
    estMin += (low ?? mid ?? 0) * l.palletCount;
    estMax += (high ?? mid ?? 0) * l.palletCount;
  }
  await tx.mixedContainerDetails.update({
    where: { workspaceId },
    data: {
      currentPalletCount,
      estValueMin: lines.length ? estMin : null,
      estValueMax: lines.length ? estMax : null,
    },
  });
}

async function appendTimeline(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  eventType: string,
  actorUserId: string | null,
  payload: Record<string, unknown> = {},
) {
  await tx.timelineEvent.create({
    data: { workspaceId, eventType, actorUserId, payload: payload as Prisma.InputJsonValue },
  });
}

async function applyMcTransition(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  action: MixedContainerAction,
  actor: AuthUser,
  auditEvent: string,
  payload: Record<string, unknown> = {},
) {
  await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);
  const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const from = ws.state as MixedContainerState;
  const t = findMcTransition(from, action);
  if (!t) throw new AppError(400, "INVALID_TRANSITION", { from, action });
  if (!t.allowedRoles.includes(actor.role as "BUYER" | "ADMIN" | "SYSTEM")) {
    throw new AppError(403, "FORBIDDEN_ROLE");
  }
  await tx.workspace.update({ where: { id: workspaceId }, data: { state: t.to } });
  await appendTimeline(tx, workspaceId, auditEvent, actor.id, payload);
  return t.to;
}

export class MixedContainerService {
  constructor(public readonly prisma: PrismaClient) {}

  async fetchDTO(id: string): Promise<ReturnType<typeof toMixedContainerDTO>> {
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: WS_INCLUDE,
    });
    if (ws.type !== "MIXED_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");
    return toMixedContainerDTO(ws);
  }

  async create(input: CreateMixedContainerInput, actor: AuthUser) {
    if (actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN_ROLE");
    const cap = MC_CONTAINER_CAPACITIES[input.containerType] ?? 24;
    const id = await this.prisma.$transaction(async (tx) => {
      const externalRef = await nextMcRef(tx);
      const ws = await tx.workspace.create({
        data: {
          externalRef,
          type: "MIXED_CONTAINER",
          state: "MC_DRAFT",
          currency: input.currency,
          createdById: actor.id,
          participants: { create: [{ userId: actor.id, participantRole: "OWNER" }] },
        },
      });
      await tx.mixedContainerDetails.create({
        data: {
          id: ws.id,
          workspaceId: ws.id,
          containerType: input.containerType,
          maxPalletCapacity: cap,
          destinationMarket: input.destinationMarket ?? null,
          currency: input.currency,
        },
      });
      await appendTimeline(tx, ws.id, "mixed_container.created", actor.id, { externalRef });
      return ws.id;
    });
    return this.fetchDTO(id);
  }

  async update(id: string, input: UpdateMixedContainerInput, actor: AuthUser) {
    await assertCanAccessMixedContainer(this.prisma, actor, id);
    const ws = await this.prisma.workspace.findUniqueOrThrow({ where: { id } });
    if (!["MC_DRAFT", "MC_BUILDING"].includes(ws.state)) {
      throw new AppError(409, "CONTAINER_NOT_EDITABLE");
    }
    const cap = input.containerType ? MC_CONTAINER_CAPACITIES[input.containerType] : undefined;
    await this.prisma.$transaction(async (tx) => {
      if (input.containerType || input.destinationMarket !== undefined || input.currency) {
        await tx.mixedContainerDetails.update({
          where: { workspaceId: id },
          data: {
            ...(input.containerType ? { containerType: input.containerType, maxPalletCapacity: cap } : {}),
            ...(input.destinationMarket !== undefined ? { destinationMarket: input.destinationMarket } : {}),
            ...(input.currency ? { currency: input.currency } : {}),
          },
        });
        if (input.currency) {
          await tx.workspace.update({ where: { id }, data: { currency: input.currency } });
        }
      }
      await applyMcTransition(tx, id, "edit_container", actor, "mixed_container.updated");
    });
    return this.fetchDTO(id);
  }

  async list(actor: AuthUser) {
    if (actor.role === "ADMIN") {
      const rows = await this.prisma.workspace.findMany({
        where: { type: "MIXED_CONTAINER" },
        include: { mixedContainerDetails: true, containerLines: { where: { removedAt: null } } },
        orderBy: { updatedAt: "desc" },
        take: 100,
      });
      return rows.map((ws) => ({
        id: ws.id,
        externalRef: ws.externalRef,
        state: ws.state,
        productCount: ws.containerLines.length,
        currentPalletCount: ws.mixedContainerDetails?.currentPalletCount ?? 0,
        estValueMin: num(ws.mixedContainerDetails?.estValueMin),
        estValueMax: num(ws.mixedContainerDetails?.estValueMax),
        createdAt: ws.createdAt.toISOString(),
        updatedAt: ws.updatedAt.toISOString(),
      }));
    }
    const parts = await this.prisma.workspaceParticipant.findMany({
      where: { userId: actor.id, participantRole: "OWNER", workspace: { type: "MIXED_CONTAINER" } },
      include: {
        workspace: {
          include: {
            mixedContainerDetails: true,
            containerLines: { where: { removedAt: null } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
    return parts.map((p) => ({
      id: p.workspace.id,
      externalRef: p.workspace.externalRef,
      state: p.workspace.state,
      productCount: p.workspace.containerLines.length,
      currentPalletCount: p.workspace.mixedContainerDetails?.currentPalletCount ?? 0,
      estValueMin: num(p.workspace.mixedContainerDetails?.estValueMin),
      estValueMax: num(p.workspace.mixedContainerDetails?.estValueMax),
      createdAt: p.workspace.createdAt.toISOString(),
      updatedAt: p.workspace.updatedAt.toISOString(),
    }));
  }

  async addLine(id: string, input: AddContainerLineInput, actor: AuthUser) {
    await assertCanAccessMixedContainer(this.prisma, actor, id);
    const ws = await this.prisma.workspace.findUniqueOrThrow({ where: { id } });
    if (!["MC_DRAFT", "MC_BUILDING"].includes(ws.state)) {
      throw new AppError(409, "CONTAINER_NOT_EDITABLE");
    }
    const product = await this.prisma.catalogProduct.findFirst({
      where: { id: input.catalogProductId, status: "ACTIVE" },
    });
    if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND");
    if (input.palletCount < product.moqPallets) {
      throw new AppError(400, "BELOW_MOQ", { moqPallets: product.moqPallets });
    }
    const packingLink = await assertValidPackingTypeForProduct(
      this.prisma,
      "MIXED_CONTAINER",
      input.catalogProductId,
      input.packingTypeId,
    );

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.containerLine.findFirst({
        where: {
          workspaceId: id,
          catalogProductId: input.catalogProductId,
          packingTypeId: input.packingTypeId,
          removedAt: null,
        },
      });
      if (existing) {
        await tx.containerLine.update({
          where: { id: existing.id },
          data: { palletCount: existing.palletCount + input.palletCount },
        });
        await applyMcTransition(tx, id, "update_product_quantity", actor, "packing_type_updated", {
          lineId: existing.id,
          palletCount: existing.palletCount + input.palletCount,
          packingTypeId: input.packingTypeId,
        });
      } else {
        const count = await tx.containerLine.count({ where: { workspaceId: id, removedAt: null } });
        await tx.containerLine.create({
          data: {
            workspaceId: id,
            catalogProductId: input.catalogProductId,
            packingTypeId: input.packingTypeId,
            palletCount: input.palletCount,
            sortOrder: count + 1,
            indicativeUnitLow: product.indicativeLow,
            indicativeUnitMid: product.indicativeMid,
            indicativeUnitHigh: product.indicativeHigh,
          },
        });
        await applyMcTransition(tx, id, "add_product", actor, "packing_type_selected", {
          catalogProductId: input.catalogProductId,
          packingTypeId: input.packingTypeId,
          packingTypeCode: packingLink.packingType.code,
        });
      }
      await recalcDetails(tx, id);
    });
    return this.fetchDTO(id);
  }

  async updateLine(id: string, lineId: string, input: UpdateContainerLineInput, actor: AuthUser) {
    await assertCanAccessMixedContainer(this.prisma, actor, id);
    const line = await this.prisma.containerLine.findFirst({
      where: { id: lineId, workspaceId: id, removedAt: null },
      include: { catalogProduct: true },
    });
    if (!line) throw new AppError(404, "LINE_NOT_FOUND");
    if (input.palletCount < line.catalogProduct.moqPallets) {
      throw new AppError(400, "BELOW_MOQ");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.containerLine.update({ where: { id: lineId }, data: { palletCount: input.palletCount } });
      await applyMcTransition(tx, id, "update_product_quantity", actor, "mixed_container.quantity_updated", {
        lineId,
        palletCount: input.palletCount,
      });
      await recalcDetails(tx, id);
    });
    return this.fetchDTO(id);
  }

  async removeLine(id: string, lineId: string, actor: AuthUser) {
    await assertCanAccessMixedContainer(this.prisma, actor, id);
    const line = await this.prisma.containerLine.findFirst({
      where: { id: lineId, workspaceId: id, removedAt: null },
    });
    if (!line) throw new AppError(404, "LINE_NOT_FOUND");
    await this.prisma.$transaction(async (tx) => {
      await tx.containerLine.update({ where: { id: lineId }, data: { removedAt: new Date() } });
      await applyMcTransition(tx, id, "remove_product", actor, "mixed_container.product_removed", { lineId });
      await recalcDetails(tx, id);
      const remaining = await tx.containerLine.count({ where: { workspaceId: id, removedAt: null } });
      if (remaining === 0) {
        await tx.workspace.update({ where: { id }, data: { state: "MC_DRAFT" } });
      }
    });
    return this.fetchDTO(id);
  }

  async requestPricing(id: string, actor: AuthUser) {
    await assertCanAccessMixedContainer(this.prisma, actor, id);
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: { containerLines: { where: { removedAt: null }, include: { packingType: true } } },
    });
    if (ws.containerLines.length === 0) throw new AppError(400, "EMPTY_CONTAINER");
    await assertLinesHavePackingType(ws.containerLines);
    if (!["MC_DRAFT", "MC_BUILDING"].includes(ws.state)) {
      throw new AppError(409, "ALREADY_SUBMITTED");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.mixedContainerDetails.update({
        where: { workspaceId: id },
        data: { pricingRequestedAt: new Date() },
      });
      await applyMcTransition(tx, id, "request_live_pricing", actor, "mixed_container.pricing_requested");
    });
    return this.fetchDTO(id);
  }

  async timeline(id: string, actor: AuthUser) {
    await assertCanAccessMixedContainer(this.prisma, actor, id);
    const events = await this.prisma.timelineEvent.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      actorUserId: e.actorUserId,
      payload: e.payload,
      createdAt: e.createdAt.toISOString(),
    }));
  }
}
