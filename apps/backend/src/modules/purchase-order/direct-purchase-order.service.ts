import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
  CreateDirectPurchaseOrderPublicSchema,
  CreateMinimalSupplierSchema,
  type CreateDirectPurchaseOrderPublicInput,
  type CreateDirectPurchaseOrderResponse,
  type CreateMinimalSupplierInput,
  type DirectPurchaseOrderLineInput,
  type SupplierSearchItem,
} from "@dmx/contracts/purchase-order.zod";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { AppError } from "../../utils/httpErrors.js";
import { socketBus } from "../../realtime/socket-bus.js";
import {
  assertCanCreateDirectPo,
  assertCanCreateMinimalSupplier,
  type AuthUser,
} from "./purchase-order.policy.js";
import {
  assertDirectPoDocumentOwnership,
  markDirectPoDocumentConsumed,
  parseDirectPoDocumentUploadId,
} from "./direct-purchase-order.document.js";
import { createDirectPurchaseOrderWorkspace } from "./direct-purchase-order.orchestration.js";
import { notifyPoEvent } from "./purchase-order.notifications.js";

export type DirectPurchaseOrderActorContext = {
  actorId: string;
  buyerId: string;
  organizationWorkspaceId: string | null;
  role: AuthUser["role"];
};

function directPoLineSku(line: DirectPurchaseOrderLineInput): string {
  return line.productCode?.trim() || line.sku?.trim() || line.unit;
}

function normalizeCompanyName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export class DirectPurchaseOrderService {
  constructor(private readonly db: PrismaClient) {}

  resolveBuyerContext(actor: AuthUser): DirectPurchaseOrderActorContext {
    assertCanCreateDirectPo(actor);
    return {
      actorId: actor.id,
      buyerId: actor.id,
      organizationWorkspaceId: null,
      role: actor.role,
    };
  }

  async searchSuppliers(actor: AuthUser, query: { search?: string; limit: number }): Promise<SupplierSearchItem[]> {
    assertCanCreateDirectPo(actor);
    const q = query.search?.trim();
    const where = {
      role: "SUPPLIER" as const,
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { organisation: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const users = await this.db.user.findMany({
      where,
      include: { organisation: { select: { name: true, location: true } } },
      take: query.limit,
      orderBy: { displayName: "asc" },
    });

    return users.map((u) => ({
      id: u.id,
      companyName: u.organisation?.name ?? u.displayName,
      countryCode: u.organisation?.location?.slice(0, 2).toUpperCase() ?? null,
      countryName: u.organisation?.location ?? null,
      primaryContactName: u.displayName,
      primaryContactEmail: u.email.includes("@suppliers.internal.demaxtore") ? null : u.email,
      supplierCode: null,
    }));
  }

  async createMinimalSupplier(
    actor: AuthUser,
    raw: CreateMinimalSupplierInput,
  ): Promise<SupplierSearchItem> {
    assertCanCreateMinimalSupplier(actor);
    const input = CreateMinimalSupplierSchema.parse(raw);

    if (input.email) {
      const email = input.email.trim().toLowerCase();
      const existing = await this.db.user.findUnique({
        where: { email },
        include: { organisation: { select: { name: true, location: true } } },
      });
      if (existing) {
        if (existing.role === "SUPPLIER") {
          throw new AppError(409, "SUPPLIER_ALREADY_EXISTS", { supplierId: existing.id });
        }
        throw new AppError(409, "EMAIL_ALREADY_REGISTERED");
      }
    }

    const normalizedName = normalizeCompanyName(input.companyName);
    const nameMatches = await this.db.organisation.findMany({
      where: {
        kind: "SUPPLIER_ORG",
        name: { equals: input.companyName.trim(), mode: "insensitive" },
      },
      include: { users: { where: { role: "SUPPLIER" }, take: 1 } },
      take: 5,
    });
    const dupOrg = nameMatches.find((o) => normalizeCompanyName(o.name) === normalizedName);
    if (dupOrg?.users[0]) {
      throw new AppError(409, "SUPPLIER_ALREADY_EXISTS", { supplierId: dupOrg.users[0].id });
    }

    const email =
      input.email?.trim().toLowerCase() ??
      `direct-supplier-${randomBytes(8).toString("hex")}@suppliers.internal.demaxtore`;
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
    const displayName = input.contactName?.trim() || input.companyName.trim();
    const location = [input.countryCode, input.address?.trim()].filter(Boolean).join(" — ") || input.countryCode;

    const user = await this.db.$transaction(async (tx) => {
      const organisation = await tx.organisation.create({
        data: {
          name: input.companyName.trim(),
          kind: "SUPPLIER_ORG",
          location,
        },
      });

      return tx.user.create({
        data: {
          email,
          passwordHash,
          displayName,
          role: "SUPPLIER",
          organisationId: organisation.id,
          whatsappPhone: input.phone?.trim() || null,
          phoneNumber: input.phone?.trim() || null,
        },
        include: { organisation: { select: { name: true, location: true } } },
      });
    });

    return {
      id: user.id,
      companyName: user.organisation?.name ?? user.displayName,
      countryCode: input.countryCode,
      countryName: user.organisation?.location ?? input.countryCode,
      primaryContactName: displayName,
      primaryContactEmail: input.email ?? null,
      supplierCode: input.supplierReferenceCode ?? null,
    };
  }

  async create(
    actor: AuthUser,
    rawBody: CreateDirectPurchaseOrderPublicInput,
  ): Promise<CreateDirectPurchaseOrderResponse> {
    const ctx = this.resolveBuyerContext(actor);
    const body = CreateDirectPurchaseOrderPublicSchema.parse(rawBody);

    await this.assertSupplierAccessible(body.supplierId);

    let documentUploadId: string | null = null;
    if (body.documentUrl) {
      const owned = await assertDirectPoDocumentOwnership(this.db, actor, body.documentUrl);
      documentUploadId = owned.uploadId;
      if (!body.documentFileName?.trim()) {
        body.documentFileName = owned.fileName;
      }
    }

    if (body.poNumberMode === "CUSTOM" && body.poNumber?.trim()) {
      const dup = await this.db.purchaseOrder.findFirst({
        where: { poNumber: body.poNumber.trim(), buyerId: ctx.buyerId },
        select: { id: true },
      });
      if (dup) throw new AppError(409, "PURCHASE_ORDER_NUMBER_ALREADY_EXISTS");
    }

    const internalInput = {
      ...body,
      buyerId: ctx.buyerId,
      organizationWorkspaceId: ctx.organizationWorkspaceId,
      lines: body.lines.map((l) => ({ ...l, sku: directPoLineSku(l) })),
    };

    const created = await createDirectPurchaseOrderWorkspace(this.db, internalInput, actor);

    if (documentUploadId) {
      await markDirectPoDocumentConsumed(this.db, documentUploadId);
    }

    const [po, orderWs] = await Promise.all([
      this.db.purchaseOrder.findUniqueOrThrow({
        where: { id: created.purchaseOrderId },
        select: {
          status: true,
          documentUrl: true,
          createdAt: true,
          issuedAt: true,
        },
      }),
      this.db.workspace.findUniqueOrThrow({
        where: { id: created.orderWorkspaceId },
        select: { state: true },
      }),
    ]);

    await notifyPoEvent(this.db, {
      orderId: created.orderWorkspaceId,
      userIds: [ctx.buyerId],
      title: "Purchase Order issued",
      message: `Direct PO ${created.poNumber} was issued successfully.`,
    });

    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(created.orderWorkspaceId, SocketEvents.PO_ISSUED, {
        poId: created.purchaseOrderId,
        orderId: created.orderWorkspaceId,
      });
      socketBus.emitToWorkspace(created.orderWorkspaceId, "workspace:update", {
        workspaceId: created.orderWorkspaceId,
        state: orderWs.state,
      });
    });

    return {
      orderId: created.orderWorkspaceId,
      purchaseOrderId: created.purchaseOrderId,
      poNumber: created.poNumber,
      source: "DIRECT",
      orderOrigin: "DIRECT_PO",
      purchaseOrderStatus: po.status,
      orderStatus: orderWs.state,
      documentUrl: po.documentUrl,
      createdAt: po.createdAt.toISOString(),
      issuedAt: (po.issuedAt ?? po.createdAt).toISOString(),
    };
  }

  private async assertSupplierAccessible(supplierId: string): Promise<void> {
    const supplier = await this.db.user.findUnique({
      where: { id: supplierId },
      select: { id: true, role: true },
    });
    if (!supplier) throw new AppError(404, "SUPPLIER_NOT_FOUND");
    if (supplier.role !== "SUPPLIER") throw new AppError(403, "SUPPLIER_ACCESS_DENIED");
  }
}

export { parseDirectPoDocumentUploadId };
