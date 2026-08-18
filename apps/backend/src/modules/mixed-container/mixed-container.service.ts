import { Prisma, PrismaClient } from "@prisma/client";
import {
  MC_CONTAINER_CAPACITIES,
  findMcTransition,
  type MixedContainerAction,
  type MixedContainerState,
} from "@dmx/contracts/mixed-container.fsm";
import {
  MC_MAX_CONTAINERS_PER_ORDER,
  type AddContainerLineInput,
  type CreateMixedContainerInput,
  type UpdateContainerLineInput,
  type UpdateMixedContainerInput,
} from "@dmx/contracts/mixed-container.zod";
import type { SubmitProcurementRequestInput } from "@dmx/contracts/mixed-container-procurement";
import { mcStateToProcurementStatus } from "@dmx/contracts/mixed-container-procurement";
import { AppError } from "../../utils/httpErrors.js";
import type { AuthUser } from "./mixed-container.policy.js";
import { assertCanAccessMixedContainer } from "./mixed-container.policy.js";
import {
  assertLinesHavePackingType,
  assertValidPackingTypeForProduct,
} from "../packing-type/packing-type.helpers.js";
import {
  nextPrRef,
  notifyAdminsNewProcurementRequest,
  notifyBuyerProcurementStatus,
  recordProcurementStatusHistory,
} from "./mc-procurement.helpers.js";

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
  createdBy: { select: { displayName: true, organisation: { select: { name: true } } } },
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
    procurementRequestRef: d.procurementRequestRef ?? null,
    procurementStatus: mcStateToProcurementStatus(ws.state),
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

async function assertContainerCapacity(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  nextTotalPallets: number,
) {
  const details = await tx.mixedContainerDetails.findUniqueOrThrow({ where: { workspaceId } });
  if (nextTotalPallets > details.maxPalletCapacity) {
    throw new AppError(400, "CONTAINER_CAPACITY_FULL", {
      maxPalletCapacity: details.maxPalletCapacity,
      requestedPallets: nextTotalPallets,
    });
  }
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

async function loadOrderContainerSlots(prisma: PrismaClient | Prisma.TransactionClient, orderGroupId: string) {
  const rows = await prisma.mixedContainerDetails.findMany({
    where: { orderGroupId },
    include: { workspace: { select: { id: true, externalRef: true, state: true } } },
    orderBy: { containerSequence: "asc" },
  });
  return rows.map((r) => ({
    id: r.workspaceId,
    externalRef: r.workspace.externalRef,
    containerSequence: r.containerSequence,
    state: r.workspace.state,
    currentPalletCount: r.currentPalletCount,
    maxPalletCapacity: r.maxPalletCapacity,
    fillPercent:
      r.maxPalletCapacity > 0 ? Math.round((r.currentPalletCount / r.maxPalletCapacity) * 100) : 0,
  }));
}

function enrichMixedContainerDTO(
  ws: WsFull,
  base: ReturnType<typeof toMixedContainerDTO>,
  orderContainers: Awaited<ReturnType<typeof loadOrderContainerSlots>>,
) {
  const d = ws.mixedContainerDetails!;
  const orderGroupId = d.orderGroupId ?? ws.id;
  const editable = ["MC_DRAFT", "MC_BUILDING"].includes(ws.state);
  const isFull = base.currentPalletCount >= base.maxPalletCapacity;
  return {
    ...base,
    orderGroupId,
    containerSequence: d.containerSequence,
    orderContainerCount: orderContainers.length,
    maxOrderContainers: MC_MAX_CONTAINERS_PER_ORDER,
    canAddContainer: editable && orderContainers.length < MC_MAX_CONTAINERS_PER_ORDER && isFull,
    orderContainers,
  };
}

export class MixedContainerService {
  constructor(public readonly prisma: PrismaClient) {}

  async fetchDTO(id: string) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: WS_INCLUDE,
    });
    if (ws.type !== "MIXED_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");
    const base = toMixedContainerDTO(ws);
    const orderGroupId = ws.mixedContainerDetails!.orderGroupId ?? ws.id;
    const orderContainers = await loadOrderContainerSlots(this.prisma, orderGroupId);
    return enrichMixedContainerDTO(ws, base, orderContainers);
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
          orderGroupId: ws.id,
          containerSequence: 1,
        },
      });
      await appendTimeline(tx, ws.id, "mixed_container.created", actor.id, { externalRef });
      return ws.id;
    });
    return this.fetchDTO(id);
  }

  async addSiblingContainer(sourceId: string, actor: AuthUser) {
    if (actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN_ROLE");
    await assertCanAccessMixedContainer(this.prisma, actor, sourceId);

    const source = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: sourceId },
      include: {
        mixedContainerDetails: true,
        containerLines: { where: { removedAt: null }, select: { palletCount: true } },
      },
    });
    if (source.type !== "MIXED_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");
    if (!["MC_DRAFT", "MC_BUILDING"].includes(source.state)) {
      throw new AppError(409, "CONTAINER_NOT_EDITABLE");
    }

    const sourceDetails = source.mixedContainerDetails!;
    const orderGroupId = sourceDetails.orderGroupId ?? sourceId;
    const currentPallets = source.containerLines.reduce((s, l) => s + l.palletCount, 0);
    if (currentPallets < sourceDetails.maxPalletCapacity) {
      throw new AppError(400, "CONTAINER_CAPACITY_NOT_FULL", {
        currentPalletCount: currentPallets,
        maxPalletCapacity: sourceDetails.maxPalletCapacity,
      });
    }

    const siblingCount = await this.prisma.mixedContainerDetails.count({ where: { orderGroupId } });
    if (siblingCount >= MC_MAX_CONTAINERS_PER_ORDER) {
      throw new AppError(400, "MAX_ORDER_CONTAINERS_REACHED", { max: MC_MAX_CONTAINERS_PER_ORDER });
    }

    const cap = MC_CONTAINER_CAPACITIES[sourceDetails.containerType] ?? 24;
    const maxSeq = await this.prisma.mixedContainerDetails.aggregate({
      where: { orderGroupId },
      _max: { containerSequence: true },
    });
    const nextSequence = (maxSeq._max.containerSequence ?? 0) + 1;

    const newId = await this.prisma.$transaction(async (tx) => {
      const externalRef = await nextMcRef(tx);
      const ws = await tx.workspace.create({
        data: {
          externalRef,
          type: "MIXED_CONTAINER",
          state: "MC_DRAFT",
          currency: sourceDetails.currency,
          createdById: actor.id,
          participants: { create: [{ userId: actor.id, participantRole: "OWNER" }] },
        },
      });
      await tx.mixedContainerDetails.create({
        data: {
          id: ws.id,
          workspaceId: ws.id,
          containerType: sourceDetails.containerType,
          maxPalletCapacity: cap,
          destinationMarket: sourceDetails.destinationMarket,
          currency: sourceDetails.currency,
          orderGroupId,
          containerSequence: nextSequence,
        },
      });
      await appendTimeline(tx, ws.id, "mixed_container.created", actor.id, {
        externalRef,
        orderGroupId,
        containerSequence: nextSequence,
        fromContainerId: sourceId,
      });
      return ws.id;
    });

    return this.fetchDTO(newId);
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
        procurementRequestRef: ws.mixedContainerDetails?.procurementRequestRef ?? null,
        state: ws.state,
        procurementStatus: mcStateToProcurementStatus(ws.state),
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
      procurementRequestRef: p.workspace.mixedContainerDetails?.procurementRequestRef ?? null,
      state: p.workspace.state,
      procurementStatus: mcStateToProcurementStatus(p.workspace.state),
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

    let packingTypeId = input.packingTypeId;
    let catalogPackagingId: string | null = null;
    let moqPallets = product.moqPallets;

    if (input.packagingId) {
      const packaging = await this.prisma.catalogPackaging.findFirst({
        where: { id: input.packagingId, productId: input.catalogProductId, status: "ACTIVE" },
        include: { packingType: true },
      });
      if (!packaging) throw new AppError(400, "INVALID_PACKAGING_FOR_PRODUCT");
      catalogPackagingId = packaging.id;
      moqPallets = packaging.moqPallets;
      if (packaging.packingTypeId && packaging.packingType?.isActive) {
        packingTypeId = packaging.packingTypeId;
      }
    }

    if (!packingTypeId) {
      throw new AppError(400, "PACKING_TYPE_REQUIRED");
    }

    if (input.palletCount < moqPallets) {
      throw new AppError(400, "BELOW_MOQ", { moqPallets });
    }
    const packingLink = await assertValidPackingTypeForProduct(
      this.prisma,
      "MIXED_CONTAINER",
      input.catalogProductId,
      packingTypeId,
    );

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.containerLine.findFirst({
        where: {
          workspaceId: id,
          catalogProductId: input.catalogProductId,
          packingTypeId,
          removedAt: null,
        },
      });
      const lines = await tx.containerLine.findMany({
        where: { workspaceId: id, removedAt: null },
        select: { palletCount: true },
      });
      const currentTotal = lines.reduce((s, l) => s + l.palletCount, 0);
      const nextTotal = currentTotal + input.palletCount;
      await assertContainerCapacity(tx, id, nextTotal);

      if (existing) {
        await tx.containerLine.update({
          where: { id: existing.id },
          data: {
            palletCount: existing.palletCount + input.palletCount,
            ...(catalogPackagingId ? { catalogPackagingId } : {}),
          },
        });
        await applyMcTransition(tx, id, "update_product_quantity", actor, "packing_type_updated", {
          lineId: existing.id,
          palletCount: existing.palletCount + input.palletCount,
          packingTypeId,
        });
      } else {
        const count = await tx.containerLine.count({ where: { workspaceId: id, removedAt: null } });
        await tx.containerLine.create({
          data: {
            workspaceId: id,
            catalogProductId: input.catalogProductId,
            catalogPackagingId,
            packingTypeId,
            palletCount: input.palletCount,
            sortOrder: count + 1,
            indicativeUnitLow: product.indicativeLow,
            indicativeUnitMid: product.indicativeMid,
            indicativeUnitHigh: product.indicativeHigh,
          },
        });
        await applyMcTransition(tx, id, "add_product", actor, "packing_type_selected", {
          catalogProductId: input.catalogProductId,
          packingTypeId,
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
      const lines = await tx.containerLine.findMany({
        where: { workspaceId: id, removedAt: null },
        select: { id: true, palletCount: true },
      });
      const currentTotal = lines.reduce((s, l) => s + l.palletCount, 0);
      const nextTotal = currentTotal - line.palletCount + input.palletCount;
      await assertContainerCapacity(tx, id, nextTotal);

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

  async requestPricing(id: string, actor: AuthUser, input: SubmitProcurementRequestInput = {}) {
    await assertCanAccessMixedContainer(this.prisma, actor, id);
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        containerLines: { where: { removedAt: null }, include: { packingType: true } },
        mixedContainerDetails: true,
        createdBy: { select: { displayName: true } },
      },
    });
    if (ws.containerLines.length === 0) throw new AppError(400, "EMPTY_CONTAINER");
    await assertLinesHavePackingType(ws.containerLines);
    if (!["MC_DRAFT", "MC_BUILDING"].includes(ws.state)) {
      throw new AppError(409, "ALREADY_SUBMITTED");
    }
    const fromState = ws.state;
    let prRef = ws.mixedContainerDetails?.procurementRequestRef ?? null;

    await this.prisma.$transaction(async (tx) => {
      if (!prRef) {
        prRef = await nextPrRef(tx);
      }
      await tx.mixedContainerDetails.update({
        where: { workspaceId: id },
        data: {
          pricingRequestedAt: new Date(),
          procurementRequestRef: prRef,
          ...(input.buyerNotes !== undefined ? { buyerNotes: input.buyerNotes } : {}),
          ...(input.destinationMarket !== undefined ? { destinationMarket: input.destinationMarket } : {}),
        },
      });
      const toState = await applyMcTransition(tx, id, "request_live_pricing", actor, "mixed_container.pricing_requested", {
        procurementRequestRef: prRef,
      });
      await recordProcurementStatusHistory(tx, {
        workspaceId: id,
        fromState,
        toState,
        actorUserId: actor.id,
        note: "Procurement request submitted",
      });
      await notifyBuyerProcurementStatus(tx, {
        workspaceId: id,
        buyerUserId: ws.createdById,
        procurementRequestRef: prRef!,
        status: "SUBMITTED",
      });
      await notifyAdminsNewProcurementRequest(tx, {
        workspaceId: id,
        procurementRequestRef: prRef!,
        buyerName: ws.createdBy.displayName,
      });
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
