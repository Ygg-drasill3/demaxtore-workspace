import { Prisma, PrismaClient } from "@prisma/client";
import {
  findMcTransition,
  type MixedContainerAction,
  type MixedContainerState,
} from "@dmx/contracts/mixed-container.fsm";
import { FREIGHTIQ_ORDER_ELIGIBLE_STATES } from "@dmx/contracts/freightiq";
import { AppError } from "../../utils/httpErrors.js";
import type { AuthUser } from "./mixed-container.policy.js";
import { spawnOrderWorkspace } from "../order/order.spawn.js";
import { createPurchaseOrderOnOrderSpawn } from "../purchase-order/purchase-order.spawn.js";
import { isOrderEligibleForFreight } from "../freightiq/freightiq.policy.js";

const SUPPLIER_CODE_EMAIL: Record<string, string> = {
  "SUP-001": "supplier1@acme-mfg.test",
  "SUP-002": "supplier1@beta-industries.test",
};

const SHIPMENT_TERMINAL = ["DELIVERED", "COMPLETED", "CLOSED"];

function num(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  return Number(v);
}

function allocationRef(sortOrder: number): string {
  return `Allocation ${sortOrder + 1}`;
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

async function nextScRef(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `SC-${year}-`;
  const last = await tx.mcMasterOrder.findFirst({
    where: { externalRef: { startsWith: prefix } },
    orderBy: { externalRef: "desc" },
    select: { externalRef: true },
  });
  const n = last ? Number(last.externalRef.slice(prefix.length)) : 0;
  return `${prefix}${String(n + 1).padStart(5, "0")}`;
}

async function resolveSupplierUserId(
  tx: Prisma.TransactionClient,
  supplierCode: string,
  supplierId: string | null,
): Promise<string> {
  if (supplierId) return supplierId;
  const email = SUPPLIER_CODE_EMAIL[supplierCode];
  if (!email) throw new AppError(400, "SUPPLIER_NOT_RESOLVED", { supplierCode });
  const user = await tx.user.findUnique({ where: { email } });
  if (!user) throw new AppError(404, "SUPPLIER_USER_NOT_FOUND", { email });
  return user.id;
}

export class MixedContainerExecutionService {
  constructor(public readonly prisma: PrismaClient) {}

  private async assertBuyerAccess(workspaceId: string, actor: AuthUser) {
    const part = await this.prisma.workspaceParticipant.findFirst({
      where: { workspaceId, userId: actor.id, participantRole: "OWNER" },
    });
    if (!part) throw new AppError(403, "FORBIDDEN");
  }

  async spawnExecutionOrders(id: string, actor: AuthUser) {
    if (actor.role !== "ADMIN" && actor.role !== "SYSTEM") throw new AppError(403, "FORBIDDEN");

    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        mixedContainerDetails: true,
        mcSupplierAllocations: {
          include: {
            containerLine: { include: { catalogProduct: true } },
            proformas: true,
            payments: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        containerLines: { where: { removedAt: null } },
        mcMasterOrders: true,
        mcOrderLinks: true,
      },
    });
    if (ws.type !== "MIXED_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");
    if (ws.state !== "MC_EXECUTION_READY") {
      throw new AppError(409, "NOT_EXECUTION_READY", { state: ws.state });
    }

    const allocatedLineIds = new Set(ws.mcSupplierAllocations.map((a) => a.containerLineId));
    const unallocated = ws.containerLines.filter((l) => !allocatedLineIds.has(l.id));
    if (unallocated.length > 0) {
      throw new AppError(409, "LINES_NOT_ALLOCATED", { count: unallocated.length });
    }
    if (ws.mcSupplierAllocations.length === 0) {
      throw new AppError(409, "NO_ALLOCATIONS");
    }
    const allPaid = ws.mcSupplierAllocations.every((a) =>
      a.payments.some((p) => p.paymentStatus === "PAYMENT_CONFIRMED"),
    );
    if (!allPaid) throw new AppError(409, "PAYMENTS_NOT_CONFIRMED");

    const { assertFreightEstimatePoGate } = await import("../freight-estimate/freight-estimate.policy.js");
    await assertFreightEstimatePoGate(this.prisma, id);

    if (ws.mcOrderLinks.length > 0) {
      const master = ws.mcMasterOrders[0];
      return {
        masterOrderRef: master?.externalRef ?? null,
        masterOrderId: master?.id ?? null,
        supplierOrders: ws.mcOrderLinks.map((l) => ({
          allocationRef: allocationRef(
            ws.mcSupplierAllocations.find((a) => a.id === l.allocationId)!.sortOrder,
          ),
          orderId: l.supplierOrderId,
          orderExternalRef: "",
        })),
        state: ws.state,
      };
    }

    const buyerUserId = ws.createdById;
    const currency = ws.mixedContainerDetails?.currency ?? ws.currency ?? "USD";
    const dest = ws.mixedContainerDetails?.destinationMarket?.slice(0, 20) ?? "NLRTM";

    try {
      return await this.prisma.$transaction(async (tx) => {
        const scRef = await nextScRef(tx);
        const master = await tx.mcMasterOrder.create({
          data: { smartContainerId: id, externalRef: scRef, status: "ACTIVE" },
        });

        const spawnedOrders: Array<{
          allocationRef: string;
          orderId: string;
          orderExternalRef: string;
        }> = [];

        for (const alloc of ws.mcSupplierAllocations) {
          const supplierUserId = await resolveSupplierUserId(tx, alloc.supplierCode, alloc.supplierId);
          const proforma = alloc.proformas[0];
          const totalValue = proforma ? num(proforma.amount)! : num(alloc.expectedExwPrice)! * alloc.allocatedPallets;
          const poNumber = `${scRef}-${alloc.sortOrder + 1}`;
          const suffix = `A${alloc.sortOrder + 1}`;

          const spawned = await spawnOrderWorkspace(tx, {
            parentWorkspaceId: id,
            parentType: "MIXED_CONTAINER",
            parentExternalRef: ws.externalRef,
            buyerUserId,
            supplierUserId,
            contractRef: poNumber,
            currency: proforma?.currency ?? currency,
            totalValue,
            incoterms: "EXW",
            originPort: "CNSHA",
            destinationPort: dest,
            actorUserId: actor.id,
            auditEvent: "order.created_from_mixed_container",
            orderRefSuffix: suffix,
            timelinePayload: {
              smartContainerId: id,
              masterOrderRef: scRef,
              allocationId: alloc.id,
              allocationRef: allocationRef(alloc.sortOrder),
            },
          });

          const product = alloc.containerLine.catalogProduct;
          await createPurchaseOrderOnOrderSpawn(tx, {
            orderId: spawned.orderWorkspaceId,
            poNumber,
            buyerId: buyerUserId,
            supplierId: supplierUserId,
            currency: proforma?.currency ?? currency,
            incoterm: "EXW",
            paymentTerms: "Direct supplier payment",
            lines: [{
              sku: product.productRef,
              description: `${product.name} — ${product.packagingDescription}`,
              quantity: alloc.allocatedPallets,
              unitPrice: num(alloc.expectedExwPrice)!,
            }],
            actorUserId: actor.id,
            actorEmail: actor.email,
            actorRole: actor.role,
            // Catalog products bought straight through a container — no RFQ negotiation.
            // A dedicated MIXED_CONTAINER enum value would be more precise but needs a
            // migration; DIRECT is accurate in the sense that matters (not RFQ-sourced).
            source: "DIRECT",
            issueReason: `SmartContainer ${scRef} allocation ${alloc.sortOrder + 1}`,
          });

          await tx.mcOrderLink.create({
            data: {
              smartContainerId: id,
              masterOrderId: master.id,
              supplierOrderId: spawned.orderWorkspaceId,
              allocationId: alloc.id,
            },
          });

          spawnedOrders.push({
            allocationRef: allocationRef(alloc.sortOrder),
            orderId: spawned.orderWorkspaceId,
            orderExternalRef: spawned.externalRef,
          });
        }

        await applyMcTransition(tx, id, "spawn_execution_orders", actor, "smartcontainer.order_spawned", {
          masterOrderRef: scRef,
          supplierOrderCount: spawnedOrders.length,
        });

        return {
          masterOrderRef: scRef,
          masterOrderId: master.id,
          supplierOrders: spawnedOrders,
          state: "MC_EXECUTION_ACTIVE",
        };
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(500, "ORDER_SPAWN_FAILED", { message: String(err) });
    }
  }

  async getExecution(id: string, actor: AuthUser, opts: { readOnly?: boolean } = {}) {
    const ws = await this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        mixedContainerDetails: true,
        mcSupplierAllocations: { orderBy: { sortOrder: "asc" } },
        mcSupplierProformas: true,
        mcMasterOrders: { orderBy: { createdAt: "desc" }, take: 1 },
        mcOrderLinks: true,
        timelineEvents: { orderBy: { createdAt: "asc" }, take: 100 },
      },
    });
    if (ws.type !== "MIXED_CONTAINER") throw new AppError(409, "WRONG_WORKSPACE_TYPE");

    if (actor.role === "BUYER") {
      await this.assertBuyerAccess(id, actor);
    } else if (actor.role !== "ADMIN") {
      throw new AppError(403, "FORBIDDEN");
    }

    const master = ws.mcMasterOrders[0] ?? null;
    const orderIds = ws.mcOrderLinks.map((l) => l.supplierOrderId);

    const orders = orderIds.length
      ? await this.prisma.workspace.findMany({
          where: { id: { in: orderIds } },
          include: { orderWorkspace: true },
        })
      : [];

    const freightRequests = orderIds.length
      ? await this.prisma.freightRequest.findMany({
          where: { orderId: { in: orderIds } },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const shipments = orderIds.length
      ? await this.prisma.workspace.findMany({
          where: { spawnedFromId: { in: orderIds }, type: "SHIPMENT" },
        })
      : [];

    const orderDocs = orderIds.length
      ? await this.prisma.orderDocument.findMany({ where: { workspaceId: { in: orderIds } } })
      : [];

    const shipmentIds = shipments.map((s) => s.id);
    const shipDocs = shipmentIds.length
      ? await this.prisma.shipmentDocument.findMany({ where: { workspaceId: { in: shipmentIds } } })
      : [];

    const allocMap = new Map(ws.mcSupplierAllocations.map((a) => [a.id, a]));
    const orderByAlloc = new Map(ws.mcOrderLinks.map((l) => [l.allocationId, l.supplierOrderId]));
    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const freightByOrder = new Map<string, string>();
    for (const fr of freightRequests) {
      if (!freightByOrder.has(fr.orderId)) freightByOrder.set(fr.orderId, fr.status);
    }
    const shipmentByOrder = new Map<string, string>();
    for (const sh of shipments) {
      if (sh.spawnedFromId) shipmentByOrder.set(sh.spawnedFromId, sh.state);
    }

    const allocations = ws.mcSupplierAllocations.map((a) => {
      const orderId = orderByAlloc.get(a.id);
      const order = orderId ? orderMap.get(orderId) : undefined;
      return {
        allocationRef: allocationRef(a.sortOrder),
        productName: "",
        orderState: order?.state ?? null,
        orderExternalRef: order?.externalRef ?? null,
        freightStatus: orderId ? freightByOrder.get(orderId) ?? null : null,
        shipmentState: orderId ? shipmentByOrder.get(orderId) ?? null : null,
        documentCount: 0,
      };
    });

    for (const a of ws.mcSupplierAllocations) {
      const idx = allocations.findIndex((x) => x.allocationRef === allocationRef(a.sortOrder));
      if (idx >= 0) allocations[idx].productName = "";
    }

    const wsWithLines = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        mcSupplierAllocations: {
          include: { containerLine: { include: { catalogProduct: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    for (const a of wsWithLines?.mcSupplierAllocations ?? []) {
      const idx = allocations.findIndex((x) => x.allocationRef === allocationRef(a.sortOrder));
      if (idx >= 0) {
        allocations[idx].productName = a.containerLine.catalogProduct.name;
        const orderId = orderByAlloc.get(a.id);
        const docCount =
          (orderId ? orderDocs.filter((d) => d.workspaceId === orderId).length : 0) +
          ws.mcSupplierProformas.filter((p) => p.allocationId === a.id).length;
        allocations[idx].documentCount = docCount;
      }
    }

    const documents: Array<{
      id: string;
      type: string;
      label: string;
      source: "PROFORMA" | "ORDER" | "SHIPMENT";
      url: string | null;
      allocationRef: string | null;
    }> = [];

    for (const p of ws.mcSupplierProformas) {
      const alloc = allocMap.get(p.allocationId);
      documents.push({
        id: p.id,
        type: "PROFORMA",
        label: `Proforma ${p.proformaNumber}`,
        source: "PROFORMA",
        url: p.documentUrl,
        allocationRef: alloc ? allocationRef(alloc.sortOrder) : null,
      });
    }
    for (const d of orderDocs) {
      documents.push({
        id: d.id,
        type: d.documentType,
        label: d.fileName,
        source: "ORDER",
        url: null,
        allocationRef: null,
      });
    }
    for (const d of shipDocs) {
      documents.push({
        id: d.id,
        type: d.documentType,
        label: d.fileName,
        source: "SHIPMENT",
        url: null,
        allocationRef: null,
      });
    }

    const timelineEvents = ws.timelineEvents;
    const eventAt = (type: string) =>
      timelineEvents.find((e) => e.eventType === type)?.createdAt.toISOString() ?? null;

    const timeline = [
      { key: "execution_ready", label: "Execution Ready", completed: !!eventAt("smartcontainer.execution_ready") || !!eventAt("mixed_container.execution_ready"), completedAt: eventAt("smartcontainer.execution_ready") ?? eventAt("mixed_container.execution_ready") },
      { key: "order_spawned", label: "Orders Created", completed: !!eventAt("smartcontainer.order_spawned"), completedAt: eventAt("smartcontainer.order_spawned") },
      { key: "freight_started", label: "Freight Started", completed: !!eventAt("smartcontainer.freight_started"), completedAt: eventAt("smartcontainer.freight_started") },
      { key: "shipment_started", label: "Shipment Started", completed: !!eventAt("smartcontainer.shipment_started"), completedAt: eventAt("smartcontainer.shipment_started") },
      { key: "execution_completed", label: "Execution Complete", completed: ws.state === "MC_EXECUTION_COMPLETE", completedAt: eventAt("smartcontainer.execution_completed") },
    ];

    let completionPercent = 0;
    if (ws.state === "MC_EXECUTION_COMPLETE") {
      completionPercent = 100;
    } else if (orderIds.length > 0) {
      let score = 0;
      for (const orderId of orderIds) {
        const order = orderMap.get(orderId);
        const shipState = shipmentByOrder.get(orderId);
        if (shipState && SHIPMENT_TERMINAL.includes(shipState)) score += 100;
        else if (shipState) score += 70;
        else if (order && (FREIGHTIQ_ORDER_ELIGIBLE_STATES as readonly string[]).includes(order.state) && freightByOrder.has(orderId)) score += 50;
        else if (order && order.state !== "ORDER_CREATED") score += 30;
        else score += 10;
      }
      completionPercent = Math.round(score / orderIds.length);
    } else if (ws.state === "MC_EXECUTION_READY") {
      completionPercent = 80;
    }

    // Callers on a pure read path (e.g. the organization aggregate) opt out of the
    // auto-completion transition so a GET never mutates workspace state.
    if (!opts.readOnly) {
      await this.tryMarkExecutionComplete(id);
    }

    return {
      workspaceId: ws.id,
      containerExternalRef: ws.externalRef,
      state: opts.readOnly
        ? ws.state
        : (await this.prisma.workspace.findUnique({ where: { id }, select: { state: true } }))!.state,
      masterOrderRef: master?.externalRef ?? null,
      masterOrderId: master?.id ?? null,
      completionPercent,
      allocations,
      documents,
      timeline,
      supplierOrderCount: orderIds.length,
    };
  }

  async tryMarkExecutionComplete(smartContainerId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: smartContainerId },
      include: { mcOrderLinks: true },
    });
    if (!ws || ws.state !== "MC_EXECUTION_ACTIVE" || ws.mcOrderLinks.length === 0) return;

    const orderIds = ws.mcOrderLinks.map((l) => l.supplierOrderId);
    const shipments = await this.prisma.workspace.findMany({
      where: { spawnedFromId: { in: orderIds }, type: "SHIPMENT" },
    });
    if (shipments.length < orderIds.length) return;
    const allDone = shipments.every((s) => SHIPMENT_TERMINAL.includes(s.state));
    if (!allDone) return;

    await this.prisma.$transaction(async (tx) => {
      await applyMcTransition(
        tx,
        smartContainerId,
        "mark_execution_complete",
        { id: "00000000-0000-0000-0000-000000000001", role: "SYSTEM", email: "system@demaxtore.local" },
        "smartcontainer.execution_completed",
      );
      await tx.mcMasterOrder.updateMany({
        where: { smartContainerId },
        data: { status: "COMPLETE" },
      });
    });
  }

  async recordFreightStarted(smartContainerId: string, orderId: string) {
    const link = await this.prisma.mcOrderLink.findFirst({
      where: { smartContainerId, supplierOrderId: orderId },
    });
    if (!link) return;
    const existing = await this.prisma.timelineEvent.findFirst({
      where: { workspaceId: smartContainerId, eventType: "smartcontainer.freight_started" },
    });
    if (existing) return;
    await this.prisma.timelineEvent.create({
      data: {
        workspaceId: smartContainerId,
        eventType: "smartcontainer.freight_started",
        actorUserId: null,
        payload: { orderId },
      },
    });
  }

  async recordShipmentStarted(smartContainerId: string, orderId: string, shipmentId: string) {
    const link = await this.prisma.mcOrderLink.findFirst({
      where: { smartContainerId, supplierOrderId: orderId },
    });
    if (!link) return;
    const existing = await this.prisma.timelineEvent.findFirst({
      where: { workspaceId: smartContainerId, eventType: "smartcontainer.shipment_started" },
    });
    if (!existing) {
      await this.prisma.timelineEvent.create({
        data: {
          workspaceId: smartContainerId,
          eventType: "smartcontainer.shipment_started",
          actorUserId: null,
          payload: { orderId, shipmentId },
        },
      });
    }
    await this.tryMarkExecutionComplete(smartContainerId);
  }

  static isOrderFreightEligible(state: string): boolean {
    return isOrderEligibleForFreight(state);
  }
}
