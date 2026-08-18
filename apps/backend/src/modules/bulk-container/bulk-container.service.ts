import { Prisma, PrismaClient } from "@prisma/client";
import {
  BC_MAX_CAPACITY_MT,
  computeBcCapacityWarnings,
  findBcTransition,
  isBcContainerFull,
  type BulkContainerAction,
  type BulkContainerState,
} from "@dmx/contracts/bulk-container.fsm";
import type { BulkSpecTemplate } from "@dmx/contracts/bulk-container-catalog";
import { applyBulkContainerFixedOrigin } from "@dmx/contracts/bulk-container-catalog";
import type {
  AddBulkContainerLineInput,
  CreateBulkContainerInput,
  UpdateBulkContainerInput,
  UpdateBulkContainerLineInput,
} from "@dmx/contracts/bulk-container.zod";
import { AppError } from "../../utils/httpErrors.js";
import type { AuthUser } from "./bulk-container.policy.js";
import { assertCanAccessBulkContainer } from "./bulk-container.policy.js";
import {
  assertLinesHavePackingType,
  assertValidPackingTypeForProduct,
} from "../packing-type/packing-type.helpers.js";

const WS_INCLUDE = {
  bulkContainerDetails: true,
  bulkContainerLines: {
    where: { removedAt: null },
    orderBy: { sortOrder: "asc" as const },
    include: {
      catalogProduct: {
        include: { category: true, specTemplate: true },
      },
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

function validateSpecValues(
  template: BulkSpecTemplate,
  specValues: Record<string, string | number>,
): void {
  for (const param of template.parameters) {
    if (!param.required) continue;
    const val = specValues[param.key];
    if (val === undefined || val === null || val === "") {
      throw new AppError(400, "SPEC_INCOMPLETE", { field: param.key });
    }
  }
}

function lineValues(line: {
  quantityMt: Prisma.Decimal;
  indicativeUnitLow: Prisma.Decimal | null;
  indicativeUnitHigh: Prisma.Decimal | null;
}) {
  const qty = Number(line.quantityMt);
  const low = num(line.indicativeUnitLow);
  const high = num(line.indicativeUnitHigh);
  return {
    lineValueMin: low != null ? low * qty : null,
    lineValueMax: high != null ? high * qty : null,
  };
}

export function toBulkContainerDTO(ws: WsFull) {
  const d = ws.bulkContainerDetails!;
  const lines = (ws.bulkContainerLines ?? []).map((l) => {
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
      standardPacking: l.catalogProduct.standardPacking,
      specValues: l.specValues as Record<string, string | number>,
      quantityMt: Number(l.quantityMt),
      indicativeUnitLow: num(l.indicativeUnitLow),
      indicativeUnitHigh: num(l.indicativeUnitHigh),
      ...vals,
    };
  });
  const currentWeightMt = lines.reduce((s, l) => s + l.quantityMt, 0);
  const maxCapacityMt = Number(d.maxCapacityMt);
  const fillPercent = maxCapacityMt > 0 ? Math.round((currentWeightMt / maxCapacityMt) * 100) : 0;
  const capacityWarnings = computeBcCapacityWarnings(currentWeightMt);
  const isFull = isBcContainerFull(currentWeightMt, maxCapacityMt);
  const estValueMin = lines.reduce((s, l) => s + (l.lineValueMin ?? 0), 0) || null;
  const estValueMax = lines.reduce((s, l) => s + (l.lineValueMax ?? 0), 0) || null;

  return {
    id: ws.id,
    externalRef: ws.externalRef,
    state: ws.state,
    maxCapacityMt,
    currentWeightMt,
    remainingMt: Math.max(0, maxCapacityMt - currentWeightMt),
    fillPercent,
    capacityWarnings,
    destinationMarket: d.destinationMarket,
    currency: d.currency,
    estValueMin: lines.length ? estValueMin : null,
    estValueMax: lines.length ? estValueMax : null,
    ownerUserId: ws.createdById,
    ownerName: ws.createdBy?.displayName ?? "",
    productCount: lines.length,
    lines,
    submittedAt: d.submittedAt?.toISOString() ?? null,
    activeOfferId: d.activeOfferId ?? null,
    isFull,
    canCreateNewContainer: isFull,
    createdAt: ws.createdAt.toISOString(),
    updatedAt: ws.updatedAt.toISOString(),
  };
}

async function nextBcRef(prisma: Prisma.TransactionClient | PrismaClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `BC-${year}-`;
  const last = await prisma.workspace.findFirst({
    where: { externalRef: { startsWith: prefix } },
    orderBy: { externalRef: "desc" },
    select: { externalRef: true },
  });
  const n = last ? Number(last.externalRef.slice(prefix.length)) : 0;
  return `${prefix}${String(n + 1).padStart(4, "0")}`;
}

async function recalcDetails(tx: Prisma.TransactionClient, workspaceId: string) {
  const lines = await tx.bulkContainerLine.findMany({
    where: { workspaceId, removedAt: null },
    select: { quantityMt: true, indicativeUnitLow: true, indicativeUnitHigh: true },
  });
  const currentWeightMt = lines.reduce((s, l) => s + Number(l.quantityMt), 0);
  let estMin = 0;
  let estMax = 0;
  for (const l of lines) {
    const qty = Number(l.quantityMt);
    const low = num(l.indicativeUnitLow);
    const high = num(l.indicativeUnitHigh);
    estMin += (low ?? 0) * qty;
    estMax += (high ?? 0) * qty;
  }
  const capacityWarnings = computeBcCapacityWarnings(currentWeightMt);
  await tx.bulkContainerDetails.update({
    where: { workspaceId },
    data: {
      currentWeightMt,
      estValueMin: lines.length ? estMin : null,
      estValueMax: lines.length ? estMax : null,
      capacityWarnings: capacityWarnings as unknown as Prisma.InputJsonValue,
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

async function applyBcTransition(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  action: BulkContainerAction,
  actor: AuthUser,
  auditEvent: string,
  payload: Record<string, unknown> = {},
) {
  await tx.$executeRawUnsafe(`SET LOCAL app.fsm_authorised = 'true'`);
  const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const from = ws.state as BulkContainerState;
  const t = findBcTransition(from, action);
  if (!t) throw new AppError(400, "INVALID_TRANSITION", { from, action });
  if (!t.allowedRoles.includes(actor.role as "BUYER" | "ADMIN" | "SYSTEM")) {
    throw new AppError(403, "FORBIDDEN_ROLE");
  }
  await tx.workspace.update({ where: { id: workspaceId }, data: { state: t.to } });
  await appendTimeline(tx, workspaceId, auditEvent, actor.id, payload);
  return t.to;
}

export class BulkContainerService {
  constructor(public readonly prisma: PrismaClient) {}

  /** Buyer-owned BC_DRAFT / BC_BUILDING container that still has spare MT capacity. */
  async findIncompleteOpenContainer(actor: AuthUser): Promise<string | null> {
    if (actor.role !== "BUYER") return null;
    const parts = await this.prisma.workspaceParticipant.findMany({
      where: {
        userId: actor.id,
        participantRole: "OWNER",
        workspace: { type: "BULK_CONTAINER", state: { in: ["BC_DRAFT", "BC_BUILDING"] } },
      },
      include: {
        workspace: {
          include: {
            bulkContainerDetails: true,
            bulkContainerLines: { where: { removedAt: null }, select: { quantityMt: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
    for (const p of parts) {
      const ws = p.workspace;
      const d = ws.bulkContainerDetails;
      if (!d) continue;
      const currentMt = ws.bulkContainerLines.reduce((s, l) => s + Number(l.quantityMt), 0);
      if (!isBcContainerFull(currentMt, Number(d.maxCapacityMt))) return ws.id;
    }
    return null;
  }

  async ensureActiveBuilding(actor: AuthUser) {
    const existing = await this.findIncompleteOpenContainer(actor);
    if (existing) return this.fetchDTO(existing);
    return this.create({ currency: "USD" }, actor);
  }

  async fetchDTO(id: string) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: WS_INCLUDE,
    });
    if (ws.type !== "BULK_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");
    return toBulkContainerDTO(ws);
  }

  async create(input: CreateBulkContainerInput, actor: AuthUser) {
    if (actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN_ROLE");
    const openId = await this.findIncompleteOpenContainer(actor);
    if (openId) throw new AppError(409, "OPEN_BULK_CONTAINER_EXISTS", { workspaceId: openId });
    const id = await this.prisma.$transaction(async (tx) => {
      const externalRef = await nextBcRef(tx);
      const ws = await tx.workspace.create({
        data: {
          externalRef,
          type: "BULK_CONTAINER",
          state: "BC_DRAFT",
          currency: input.currency,
          createdById: actor.id,
          participants: { create: [{ userId: actor.id, participantRole: "OWNER" }] },
        },
      });
      await tx.bulkContainerDetails.create({
        data: {
          id: ws.id,
          workspaceId: ws.id,
          maxCapacityMt: BC_MAX_CAPACITY_MT,
          destinationMarket: input.destinationMarket ?? null,
          currency: input.currency,
        },
      });
      await appendTimeline(tx, ws.id, "bulk_container.created", actor.id, { externalRef });
      return ws.id;
    });
    return this.fetchDTO(id);
  }

  async update(id: string, input: UpdateBulkContainerInput, actor: AuthUser) {
    await assertCanAccessBulkContainer(this.prisma, actor, id);
    const ws = await this.prisma.workspace.findUniqueOrThrow({ where: { id } });
    if (!["BC_DRAFT", "BC_BUILDING"].includes(ws.state)) {
      throw new AppError(409, "CONTAINER_NOT_EDITABLE");
    }
    await this.prisma.$transaction(async (tx) => {
      if (input.destinationMarket !== undefined || input.currency) {
        await tx.bulkContainerDetails.update({
          where: { workspaceId: id },
          data: {
            ...(input.destinationMarket !== undefined ? { destinationMarket: input.destinationMarket } : {}),
            ...(input.currency ? { currency: input.currency } : {}),
          },
        });
        if (input.currency) {
          await tx.workspace.update({ where: { id }, data: { currency: input.currency } });
        }
      }
      await applyBcTransition(tx, id, "edit_container", actor, "bulk_container.updated");
    });
    return this.fetchDTO(id);
  }

  async list(actor: AuthUser) {
    if (actor.role === "ADMIN") {
      const rows = await this.prisma.workspace.findMany({
        where: { type: "BULK_CONTAINER" },
        include: { bulkContainerDetails: true, bulkContainerLines: { where: { removedAt: null } } },
        orderBy: { updatedAt: "desc" },
        take: 100,
      });
      return rows.map((ws) => ({
        id: ws.id,
        externalRef: ws.externalRef,
        state: ws.state,
        productCount: ws.bulkContainerLines.length,
        currentWeightMt: num(ws.bulkContainerDetails?.currentWeightMt) ?? 0,
        fillPercent: ws.bulkContainerDetails
          ? Math.round((Number(ws.bulkContainerDetails.currentWeightMt) / Number(ws.bulkContainerDetails.maxCapacityMt)) * 100)
          : 0,
        estValueMin: num(ws.bulkContainerDetails?.estValueMin),
        estValueMax: num(ws.bulkContainerDetails?.estValueMax),
        createdAt: ws.createdAt.toISOString(),
        updatedAt: ws.updatedAt.toISOString(),
      }));
    }
    const parts = await this.prisma.workspaceParticipant.findMany({
      where: { userId: actor.id, participantRole: "OWNER", workspace: { type: "BULK_CONTAINER" } },
      include: {
        workspace: {
          include: {
            bulkContainerDetails: true,
            bulkContainerLines: { where: { removedAt: null } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
    return parts.map((p) => ({
      id: p.workspace.id,
      externalRef: p.workspace.externalRef,
      state: p.workspace.state,
      productCount: p.workspace.bulkContainerLines.length,
      currentWeightMt: num(p.workspace.bulkContainerDetails?.currentWeightMt) ?? 0,
      fillPercent: p.workspace.bulkContainerDetails
        ? Math.round((Number(p.workspace.bulkContainerDetails.currentWeightMt) / Number(p.workspace.bulkContainerDetails.maxCapacityMt)) * 100)
        : 0,
      estValueMin: num(p.workspace.bulkContainerDetails?.estValueMin),
      estValueMax: num(p.workspace.bulkContainerDetails?.estValueMax),
      createdAt: p.workspace.createdAt.toISOString(),
      updatedAt: p.workspace.updatedAt.toISOString(),
    }));
  }

  async addLine(id: string, input: AddBulkContainerLineInput, actor: AuthUser) {
    await assertCanAccessBulkContainer(this.prisma, actor, id);
    const ws = await this.prisma.workspace.findUniqueOrThrow({ where: { id } });
    if (!["BC_DRAFT", "BC_BUILDING"].includes(ws.state)) {
      throw new AppError(409, "CONTAINER_NOT_EDITABLE");
    }
    const product = await this.prisma.bulkCatalogProduct.findFirst({
      where: { id: input.catalogProductId, status: "ACTIVE" },
      include: { specTemplate: true },
    });
    if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND");
    const template = product.specTemplate.schema as BulkSpecTemplate;
    const specValues = applyBulkContainerFixedOrigin(input.specValues, template.parameters);
    validateSpecValues(template, specValues);
    if (input.quantityMt < Number(product.minOrderMt)) {
      throw new AppError(400, "BELOW_MOQ", { minOrderMt: Number(product.minOrderMt) });
    }
    const packingLink = await assertValidPackingTypeForProduct(
      this.prisma,
      "BULK_CONTAINER",
      input.catalogProductId,
      input.packingTypeId,
    );

    const current = await this.fetchDTO(id);
    if (current.isFull) throw new AppError(409, "CONTAINER_FULL");
    if (current.currentWeightMt + input.quantityMt > current.maxCapacityMt + 1e-9) {
      throw new AppError(409, "CONTAINER_CAPACITY_EXCEEDED", { remainingMt: current.remainingMt });
    }

    await this.prisma.$transaction(async (tx) => {
      const count = await tx.bulkContainerLine.count({ where: { workspaceId: id, removedAt: null } });
      await tx.bulkContainerLine.create({
        data: {
          workspaceId: id,
          catalogProductId: input.catalogProductId,
          packingTypeId: input.packingTypeId,
          specValues: specValues as Prisma.InputJsonValue,
          quantityMt: input.quantityMt,
          sortOrder: count + 1,
          indicativeUnitLow: product.indicativeLow,
          indicativeUnitHigh: product.indicativeHigh,
        },
      });
      await applyBcTransition(tx, id, "add_product", actor, "packing_type_selected", {
        catalogProductId: input.catalogProductId,
        packingTypeId: input.packingTypeId,
        packingTypeCode: packingLink.packingType.code,
      });
      await recalcDetails(tx, id);
    });
    return this.fetchDTO(id);
  }

  async updateLine(id: string, lineId: string, input: UpdateBulkContainerLineInput, actor: AuthUser) {
    await assertCanAccessBulkContainer(this.prisma, actor, id);
    const line = await this.prisma.bulkContainerLine.findFirst({
      where: { id: lineId, workspaceId: id, removedAt: null },
      include: { catalogProduct: { include: { specTemplate: true } } },
    });
    if (!line) throw new AppError(404, "LINE_NOT_FOUND");
    if (input.quantityMt < Number(line.catalogProduct.minOrderMt)) {
      throw new AppError(400, "BELOW_MOQ");
    }
    if (input.specValues) {
      const template = line.catalogProduct.specTemplate.schema as BulkSpecTemplate;
      input.specValues = applyBulkContainerFixedOrigin(input.specValues, template.parameters);
      validateSpecValues(template, input.specValues);
    }
    const current = await this.fetchDTO(id);
    const otherMt = current.lines.filter((l) => l.id !== lineId).reduce((s, l) => s + l.quantityMt, 0);
    if (otherMt + input.quantityMt > current.maxCapacityMt + 1e-9) {
      throw new AppError(409, "CONTAINER_CAPACITY_EXCEEDED", { remainingMt: Math.max(0, current.maxCapacityMt - otherMt) });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.bulkContainerLine.update({
        where: { id: lineId },
        data: {
          quantityMt: input.quantityMt,
          ...(input.specValues ? { specValues: input.specValues as Prisma.InputJsonValue } : {}),
        },
      });
      await applyBcTransition(tx, id, "update_product_quantity", actor, "bulk_container.updated", { lineId });
      await recalcDetails(tx, id);
    });
    return this.fetchDTO(id);
  }

  async removeLine(id: string, lineId: string, actor: AuthUser) {
    await assertCanAccessBulkContainer(this.prisma, actor, id);
    const line = await this.prisma.bulkContainerLine.findFirst({
      where: { id: lineId, workspaceId: id, removedAt: null },
    });
    if (!line) throw new AppError(404, "LINE_NOT_FOUND");
    await this.prisma.$transaction(async (tx) => {
      await tx.bulkContainerLine.update({ where: { id: lineId }, data: { removedAt: new Date() } });
      await applyBcTransition(tx, id, "remove_product", actor, "bulk_container.updated", { lineId });
      await recalcDetails(tx, id);
      const remaining = await tx.bulkContainerLine.count({ where: { workspaceId: id, removedAt: null } });
      if (remaining === 0) {
        await tx.workspace.update({ where: { id }, data: { state: "BC_DRAFT" } });
      }
    });
    return this.fetchDTO(id);
  }

  async submitRequest(id: string, actor: AuthUser) {
    await assertCanAccessBulkContainer(this.prisma, actor, id);
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: { bulkContainerLines: { where: { removedAt: null }, include: { packingType: true } } },
    });
    if (ws.bulkContainerLines.length === 0) throw new AppError(400, "EMPTY_CONTAINER");
    await assertLinesHavePackingType(ws.bulkContainerLines);
    if (!["BC_DRAFT", "BC_BUILDING"].includes(ws.state)) {
      throw new AppError(409, "ALREADY_SUBMITTED");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.bulkContainerDetails.update({
        where: { workspaceId: id },
        data: { submittedAt: new Date() },
      });
      await applyBcTransition(tx, id, "submit_request", actor, "bulk_container.submitted");
    });
    return this.fetchDTO(id);
  }

  async timeline(id: string, actor: AuthUser) {
    await assertCanAccessBulkContainer(this.prisma, actor, id);
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
