// apps/backend/src/modules/rfq/rfq.service.read.ts
// Augments RfqService with the read + draft methods that the controller calls
// but were not part of the FSM-frozen `rfq.service.ts`. Kept in a separate
// file so the FSM-critical applyTransition() in rfq.service.ts stays untouched.
import { Prisma } from "@prisma/client";
import type { Workspace } from "@prisma/client";
import {
  type CreateRfqDraftInput, type EditRfqDraftInput, type ListRfqQuery,
} from "@dmx/contracts/rfq.zod";
import type { ActorRole } from "@dmx/contracts/rfq.fsm";
import type { NextActionContext } from "@dmx/contracts/rfq.next-actions";
import { RfqService } from "./rfq.service";
import { AppError } from "../../utils/httpErrors.js";
import type { AuthUser } from "./rfq.policy";
import { canAccessRfq } from "./rfq.policy";
import { repairRfqStateIfOrderClosed } from "./rfq-order.sync.js";
import { CatalogIntakeDTO } from "@dmx/contracts/catalog-rfq-intake";
import { redactRfqDtoForSupplier, redactRfqListItemForSupplier } from "./supplier-rfq-redact.js";
import { mapRfqParticipantsForViewer } from "./rfq-participants.js";

type WsFull = Prisma.WorkspaceGetPayload<{
  include: {
    rfqDetails: true;
    rfqLineItems: { orderBy: { position: "asc" } };
    supplierAssignments: true;
    participants: true;
    createdBy: { select: { displayName: true } };
  };
}>;

// ─── Module augmentation: tell TS about the new methods ──────────────────────
declare module "./rfq.service" {
  interface RfqService {
    createDraft(input: CreateRfqDraftInput, actor: AuthUser): Promise<unknown>;
    editDraft(wsId: string, input: EditRfqDraftInput, actor: AuthUser): Promise<unknown>;
    list(query: ListRfqQuery, actor: AuthUser): Promise<unknown>;
    toDTO(ws: WsFull | Workspace & Record<string, unknown>, actor?: AuthUser): Promise<unknown>;
    fetchDTO(wsId: string, actor?: AuthUser): Promise<unknown>;
    timeline(wsId: string, query: unknown): Promise<unknown>;
    listClarifications(wsId: string): Promise<unknown>;
    listAttachments(wsId: string): Promise<unknown>;
    buildNextActionContext(ws: WsFull, actor: AuthUser): Promise<NextActionContext>;
    markClarificationRead(wsId: string, messageId: string, userId: string): Promise<void>;
    adminQueue(): Promise<unknown>;
    lookupSuppliers(query: { q?: string; category?: string; country?: string; limit: number }): Promise<unknown>;
    moveToTrash(wsId: string, actor: AuthUser): Promise<void>;
    restoreFromTrash(wsId: string, actor: AuthUser): Promise<void>;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function dtoFromWorkspace(ws: WsFull): Record<string, unknown> {
  const d = ws.rfqDetails;
  const meta = (ws as { metadata?: unknown }).metadata;
  const catalogRaw =
    meta && typeof meta === "object" && meta !== null && "catalogIntake" in meta
      ? (meta as { catalogIntake?: unknown }).catalogIntake
      : undefined;
  const catalogIntake = catalogRaw
    ? CatalogIntakeDTO.safeParse(catalogRaw).success
      ? CatalogIntakeDTO.parse(catalogRaw)
      : undefined
    : undefined;

  return {
    id:                  ws.id,
    externalRef:         ws.externalRef,
    state:               ws.state,
    currency:            ws.currency,
    title:               d?.title              ?? "",
    productCategory:     d?.productCategory    ?? "",
    productDescription:  d?.productDescription ?? "",
    targetMarket:        d?.targetMarket       ?? "",
    incoterm:            d?.incoterm           ?? "FOB",
    deadlineAt:                  ws.deadlineAt?.toISOString() ?? null,
    deadlineExtensionCount:      ws.deadlineExtensionCount,
    deadlineExtensionTotalDays:  ws.deadlineExtensionTotalDays,
    ownerUserId:         ws.createdById,
    ownerName:           ws.createdBy?.displayName ?? "",
    createdAt:           ws.createdAt.toISOString(),
    updatedAt:           ws.updatedAt.toISOString(),
    lineItems: (ws.rfqLineItems ?? []).map((li) => ({
      id:          li.id,
      position:    li.position,
      description: li.description,
      quantity:    Number(li.quantity),
      uom:         li.uom,
      notes:       li.notes,
    })),
    selectedSupplierUserId: d?.selectedSupplierUserId ?? null,
    selectedQuotationId:    d?.selectedQuotationId    ?? null,
    poNumber:               d?.poNumber               ?? null,
    procurementMethod:      d?.procurementMethod      ?? null,
    linkedCommoditybidId:   d?.linkedCommoditybidId   ?? null,
    trashedAt:              ws.trashedAt?.toISOString() ?? null,
    participants: (ws.participants ?? []).map((p) => ({
      userId: p.userId, participantRole: p.participantRole,
    })),
    catalogIntake: catalogIntake ?? null,
  };
}

async function nextExternalRef(prisma: Prisma.TransactionClient | RfqService["prisma"]): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `RFQ-${year}-`;
  const last = await (prisma as RfqService["prisma"]).workspace.findFirst({
    where:  { externalRef: { startsWith: prefix } },
    orderBy: { externalRef: "desc" },
    select: { externalRef: true },
  });
  const lastNum = last ? Number(last.externalRef.slice(prefix.length)) : 0;
  return `${prefix}${String(lastNum + 1).padStart(4, "0")}`;
}

// ─── Method implementations attached to RfqService.prototype ─────────────────

RfqService.prototype.createDraft = async function (input, actor) {
  if (actor.role !== "BUYER") throw new AppError(403, "FORBIDDEN_ROLE");
  const prisma = this.prisma;

  const created = await prisma.$transaction(async (tx) => {
    const externalRef = await nextExternalRef(tx);
    const ws = await tx.workspace.create({
      data: {
        externalRef,
        type:        "RFQ",
        state:       "RFQ_DRAFT",
        currency:    input.currency,
        deadlineAt:  new Date(input.deadlineAt),
        createdById: actor.id,
        rfqDetails: {
          create: {
            title:              input.title,
            productCategory:    input.productCategory,
            productDescription: input.productDescription,
            targetMarket:       input.targetMarket,
            incoterm:           input.incoterm,
          },
        },
        rfqLineItems: {
          create: input.lineItems.map((li, i) => ({
            position:    i + 1,
            description: li.description,
            quantity:    new Prisma.Decimal(li.quantity),
            uom:         li.uom,
            notes:       li.notes ?? null,
          })),
        },
        participants: {
          create: [{ userId: actor.id, participantRole: "OWNER" }],
        },
      },
    });

    await tx.timelineEvent.create({
      data: {
        workspaceId: ws.id,
        eventType:   "rfq.draft.created",
        actorUserId: actor.id,
        payload:     {},
      },
    });
    return ws.id;
  });

  void (async () => {
    const { bootstrapWorkspaceConversationAsync, emitConversationSystemEvent } =
      await import("../conversation-hub/conversation-hub.hooks.js");
    bootstrapWorkspaceConversationAsync(prisma, "RFQ", created);
    emitConversationSystemEvent(prisma, "RFQ", created, "WORKSPACE_CREATED", actor.id, input.title);
  })();

  return await this.fetchDTO(created, actor);
};

RfqService.prototype.editDraft = async function (wsId, input, actor) {
  const prisma = this.prisma;
  const ws = await prisma.workspace.findUnique({ where: { id: wsId } });
  if (!ws) throw new AppError(404, "RFQ_NOT_FOUND");
  if (ws.state !== "RFQ_DRAFT") throw new AppError(409, "RFQ_NOT_DRAFT");
  if (ws.createdById !== actor.id && actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");

  await prisma.$transaction(async (tx) => {
    await tx.rfqDetails.update({
      where: { workspaceId: wsId },
      data: {
        title:              input.title,
        productCategory:    input.productCategory,
        productDescription: input.productDescription,
        targetMarket:       input.targetMarket,
        incoterm:           input.incoterm,
      },
    });

    if (input.deadlineAt) {
      await tx.workspace.update({
        where: { id: wsId },
        data:  { deadlineAt: new Date(input.deadlineAt), currency: input.currency ?? ws.currency },
      });
    }

    if (input.lineItems) {
      await tx.rfqLineItem.deleteMany({ where: { workspaceId: wsId } });
      await tx.rfqLineItem.createMany({
        data: input.lineItems.map((li, i) => ({
          workspaceId: wsId,
          position:    i + 1,
          description: li.description,
          quantity:    new Prisma.Decimal(li.quantity),
          uom:         li.uom,
          notes:       li.notes ?? null,
        })),
      });
    }

    await tx.timelineEvent.create({
      data: { workspaceId: wsId, eventType: "rfq.draft.edited", actorUserId: actor.id, payload: {} },
    });
  });

  return await this.fetchDTO(wsId, actor);
};

RfqService.prototype.list = async function (query, actor) {
  const where: Prisma.WorkspaceWhereInput = { type: "RFQ" };
  if (query.view === "trash") {
    where.trashedAt = { not: null };
  } else if (query.view !== "all") {
    where.trashedAt = null;
  }
  if (query.state) where.state = query.state;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) (where.createdAt as { gte?: Date }).gte = new Date(query.from);
    if (query.to)   (where.createdAt as { lte?: Date }).lte = new Date(query.to);
  }
  if (query.q) {
    where.OR = [
      { externalRef: { contains: query.q, mode: "insensitive" } },
      { rfqDetails: { title: { contains: query.q, mode: "insensitive" } } },
    ];
  }
  if (actor.role === "BUYER") {
    where.createdById = actor.id;
  } else if (actor.role === "SUPPLIER") {
    where.participants = { some: { userId: actor.id } };
    where.state = where.state ?? { in: [
      "SUPPLIERS_ASSIGNED",
      "RFQ_OPEN", "QUOTATIONS_CLOSED", "UNDER_EVALUATION", "SUPPLIER_SELECTED",
      "PROFORMA_REQUESTED", "PROFORMA_RECEIVED", "PROFORMA_APPROVED", "PO_ISSUED", "CLOSED",
      "CANCELLED", "EXPIRED", "CLOSED_NO_AWARD",
    ] };
  }
  if (query.cursor) where.createdAt = { ...(where.createdAt as object), lt: new Date(query.cursor) };

  const orderBy: Prisma.WorkspaceOrderByWithRelationInput =
    query.sort === "oldest" ? { createdAt: "asc" } :
    query.sort === "deadline" ? { deadlineAt: "asc" } :
    { createdAt: "desc" };

  const rows = await this.prisma.workspace.findMany({
    where,
    orderBy,
    take: query.limit + 1,
    include: {
      rfqDetails: {
        select: { title: true, procurementMethod: true, linkedCommoditybidId: true, productCategory: true },
      },
      createdBy:  { select: { displayName: true } },
      _count:     { select: { rfqLineItems: true } },
    },
  });
  for (const r of rows) {
    if (r.state === "PO_ISSUED") {
      const repaired = await repairRfqStateIfOrderClosed(this.prisma, r.id);
      if (repaired) r.state = "CLOSED";
    }
  }
  let nextCursor: string | null = null;
  if (rows.length > query.limit) {
    const last = rows.pop()!;
    nextCursor = last.createdAt.toISOString();
  }

  let myQuotedWorkspaceIds = new Set<string>();
  if (actor.role === "SUPPLIER" && rows.length > 0) {
    const quoted = await this.prisma.quotation.findMany({
      where: {
        workspaceId: { in: rows.map((r) => r.id) },
        supplierUserId: actor.id,
        status: { not: "WITHDRAWN" },
      },
      select: { workspaceId: true },
    });
    myQuotedWorkspaceIds = new Set(quoted.map((q) => q.workspaceId));
  }

  return {
    items: rows.map((r) => {
      const item = {
      id:             r.id,
      externalRef:    r.externalRef,
      title:          r.rfqDetails?.title ?? "",
      state:          r.state,
      createdAt:      r.createdAt.toISOString(),
      deadlineAt:     r.deadlineAt?.toISOString() ?? null,
      lastActivityAt: r.updatedAt.toISOString(),
      ownerName:      r.createdBy?.displayName ?? "",
      currency:       r.currency,
      productCategory: r.rfqDetails?.productCategory ?? "",
      lineItemCount:  r._count.rfqLineItems,
      procurementMethod: r.rfqDetails?.procurementMethod ?? null,
      linkedCommoditybidId: r.rfqDetails?.linkedCommoditybidId ?? null,
      trashedAt: r.trashedAt?.toISOString() ?? null,
      ...(actor.role === "SUPPLIER" ? { hasMyQuotation: myQuotedWorkspaceIds.has(r.id) } : {}),
    };
      return actor.role === "SUPPLIER" ? redactRfqListItemForSupplier(item) : item;
    }),
    nextCursor,
  };
};

RfqService.prototype.toDTO = async function (ws, actor?: AuthUser) {
  const wsFull = ws as WsFull;
  const base = dtoFromWorkspace(wsFull);
  const { resolveLineItemProductImageUrl } = await import("./rfq-product-image.js");

  const participantUserIds = [...new Set((wsFull.participants ?? []).map((p) => p.userId))];
  const participantUsers = participantUserIds.length
    ? await this.prisma.user.findMany({
        where: { id: { in: participantUserIds } },
        select: {
          id: true,
          displayName: true,
          email: true,
          organisation: { select: { name: true } },
        },
      })
    : [];
  const userMap = new Map(participantUsers.map((u) => [u.id, u]));
  const participants = mapRfqParticipantsForViewer({
    state: wsFull.state,
    participants: wsFull.participants ?? [],
    users: userMap,
    viewerRole: actor?.role,
    viewerId: actor?.id,
  });

  const rawLines = (base.lineItems as Array<{
    id: string;
    position: number;
    description: string;
    quantity: number;
    uom: string;
    notes: string | null;
  }>) ?? [];

  const lineItems = await Promise.all(
    rawLines.map(async (li) => ({
      ...li,
      imageUrl: await resolveLineItemProductImageUrl(wsFull.id, li.description),
    })),
  );

  const productImageUrl = rawLines.length === 1
    ? lineItems[0]?.imageUrl ?? null
    : null;

  const enriched = { ...base, lineItems, productImageUrl, participants };
  if (actor?.role === "SUPPLIER") {
    const { getAllowedQuoteLineIds } = await import("./supplier-line-scope.service.js");
    const allowedQuoteLineItemIds = await getAllowedQuoteLineIds(ws.id, actor.id);
    return redactRfqDtoForSupplier(
      { ...enriched, allowedQuoteLineItemIds } as Parameters<typeof redactRfqDtoForSupplier>[0],
      actor.id,
    );
  }
  return enriched;
};

RfqService.prototype.fetchDTO = async function (wsId, actor?: AuthUser) {
  const ws = await this.prisma.workspace.findUnique({
    where: { id: wsId },
    include: {
      rfqDetails: true,
      rfqLineItems: { orderBy: { position: "asc" } },
      supplierAssignments: true,
      participants: true,
      createdBy: { select: { displayName: true } },
    },
  });
  if (!ws) throw new AppError(404, "RFQ_NOT_FOUND");
  if (ws.state === "PO_ISSUED") {
    const repaired = await repairRfqStateIfOrderClosed(this.prisma, wsId);
    if (repaired) {
      const refreshed = await this.prisma.workspace.findUnique({
        where: { id: wsId },
        include: {
          rfqDetails: true,
          rfqLineItems: { orderBy: { position: "asc" } },
          supplierAssignments: true,
          participants: true,
          createdBy: { select: { displayName: true } },
        },
      });
      if (refreshed) return this.toDTO(refreshed, actor);
    }
  }
  return this.toDTO(ws, actor);
};

RfqService.prototype.timeline = async function (wsId, _query) {
  const events = await this.prisma.timelineEvent.findMany({
    where:   { workspaceId: wsId },
    orderBy: { createdAt: "asc" },
    include: { actor: { select: { id: true, displayName: true, role: true } } },
    take: 200,
  });
  return events.map((e) => ({
    id:        e.id,
    eventType: e.eventType,
    payload:   e.payload,
    actor:     e.actor,
    createdAt: e.createdAt.toISOString(),
  }));
};

RfqService.prototype.listClarifications = async function (wsId) {
  const thread = await this.prisma.clarificationThread.findUnique({
    where: { workspaceId: wsId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          readReceipts: { select: { userId: true, readAt: true } },
          attachments: {
            select: {
              id: true,
              fileName: true,
              fileSizeBytes: true,
              mimeType: true,
              uploadedById: true,
            },
          },
        },
      },
    },
  });
  if (!thread) return { messages: [] };

  const authorIds = [...new Set(thread.messages.map((m) => m.authorUserId))];
  const authors = authorIds.length
    ? await this.prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true, displayName: true, organisation: { select: { name: true } } },
      })
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  return {
    threadId: thread.id,
    messages: thread.messages.map((m) => {
      const author = authorMap.get(m.authorUserId);
      return {
        id:               m.id,
        authorUserId:     m.authorUserId,
        authorName:       author?.displayName ?? null,
        authorOrg:        author?.organisation?.name ?? null,
        parentMessageId:  m.parentMessageId,
        body:             m.body,
        visibility:       m.visibility,
        mentionedUserIds: m.mentionedUserIds,
        createdAt:        m.createdAt.toISOString(),
        readBy:           m.readReceipts,
        readReceipts:     m.readReceipts.map((r) => ({
          userId: r.userId,
          userName: authorMap.get(r.userId)?.displayName ?? r.userId,
          readAt: r.readAt.toISOString(),
        })),
        attachments: m.attachments.map((a) => ({
          id:        a.id,
          fileName:  a.fileName,
          sizeBytes: a.fileSizeBytes,
          url:       `/api/rfq/${wsId}/attachments/${a.id}`,
        })),
      };
    }),
  };
};

RfqService.prototype.listAttachments = async function (wsId) {
  const rows = await this.prisma.rfqAttachment.findMany({
    where:   { workspaceId: wsId },
    orderBy: { uploadedAt: "desc" },
  });
  const uploaderIds = [...new Set(rows.map((r) => r.uploadedById))];
  const uploaders = uploaderIds.length
    ? await this.prisma.user.findMany({
        where: { id: { in: uploaderIds } },
        select: { id: true, displayName: true },
      })
    : [];
  const uploaderMap = new Map(uploaders.map((u) => [u.id, u.displayName]));
  return rows.map((r) => ({
    id:            r.id,
    fileName:      r.fileName,
    fileSizeBytes: r.fileSizeBytes,
    sizeBytes:     r.fileSizeBytes,
    mimeType:      r.mimeType,
    version:       r.version,
    uploadedById:  r.uploadedById,
    uploadedBy:    r.uploadedById,
    uploaderName:  uploaderMap.get(r.uploadedById) ?? null,
    uploadedAt:    r.uploadedAt.toISOString(),
    url:           `/api/rfq/${wsId}/attachments/${r.id}`,
  }));
};

RfqService.prototype.buildNextActionContext = async function (ws, actor) {
  const actorRole: ActorRole = actor.role;
  const selected = ws.rfqDetails?.selectedSupplierUserId ?? null;
  const isCounterparty =
    ws.participants.some((p) => p.userId === actor.id && p.participantRole === "COUNTERPARTY");
  return {
    state: ws.state as NextActionContext["state"],
    actorRole,
    isOwner: ws.createdById === actor.id,
    isCounterparty,
    isSelectedSupplier: selected === actor.id,
    hasQuotationFromUser:
      (await this.prisma.quotation.count({
        where: { workspaceId: ws.id, supplierUserId: actor.id, withdrawnAt: null },
      })) > 0,
  };
};

RfqService.prototype.markClarificationRead = async function (wsId, messageId, userId) {
  void wsId;
  await this.prisma.clarificationReadReceipt.upsert({
    where:  { messageId_userId: { messageId, userId } },
    create: { messageId, userId },
    update: {},
  });
};

RfqService.prototype.adminQueue = async function () {
  const grouped = await this.prisma.workspace.groupBy({
    by: ["state"],
    where: { type: "RFQ" },
    _count: { _all: true },
  });
  const recent = await this.prisma.workspace.findMany({
    where:   { type: "RFQ", state: { in: ["RFQ_SUBMITTED", "SUPPLIERS_ASSIGNED"] } },
    orderBy: { createdAt: "desc" },
    take:    20,
    include: { rfqDetails: { select: { title: true } }, createdBy: { select: { displayName: true } } },
  });
  return {
    countsByState: Object.fromEntries(grouped.map((g) => [g.state, g._count._all])),
    triageQueue: recent.map((r) => ({
      id: r.id, externalRef: r.externalRef, state: r.state,
      title: r.rfqDetails?.title ?? "", ownerName: r.createdBy?.displayName ?? "",
      createdAt: r.createdAt.toISOString(),
    })),
  };
};

RfqService.prototype.lookupSuppliers = async function (query) {
  const where: Prisma.UserWhereInput = { role: "SUPPLIER" };
  if (query.q) {
    where.OR = [
      { displayName: { contains: query.q, mode: "insensitive" } },
      { email:       { contains: query.q, mode: "insensitive" } },
      { organisation: { name: { contains: query.q, mode: "insensitive" } } },
    ];
  }
  const users = await this.prisma.user.findMany({
    where,
    include: { organisation: { select: { name: true, location: true, verifiedSince: true, pastPoCount: true } } },
    take: query.limit,
  });
  return users
    .filter((u) => !query.country || u.organisation?.location?.includes(query.country))
    .map((u) => ({
      id:             u.id,
      displayName:    u.displayName,
      email:          u.email,
      organisation:   u.organisation?.name ?? null,
      location:       u.organisation?.location ?? null,
      verifiedSince:  u.organisation?.verifiedSince?.toISOString() ?? null,
      pastPoCount:    u.organisation?.pastPoCount ?? 0,
    }));
};

RfqService.prototype.moveToTrash = async function (wsId, actor) {
  const ws = await this.prisma.workspace.findUnique({
    where: { id: wsId },
    select: { id: true, type: true, createdById: true, trashedAt: true },
  });
  if (!ws || ws.type !== "RFQ") throw new AppError(404, "RFQ_NOT_FOUND");
  if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
  if (ws.trashedAt) return;

  await this.prisma.$transaction(async (tx) => {
    await tx.workspace.update({
      where: { id: wsId },
      data: { trashedAt: new Date() },
    });
    await tx.timelineEvent.create({
      data: { workspaceId: wsId, eventType: "rfq.trashed", actorUserId: actor.id, payload: {} },
    });
  });
};

RfqService.prototype.restoreFromTrash = async function (wsId, actor) {
  const ws = await this.prisma.workspace.findUnique({
    where: { id: wsId },
    select: { id: true, type: true, createdById: true, trashedAt: true },
  });
  if (!ws || ws.type !== "RFQ") throw new AppError(404, "RFQ_NOT_FOUND");
  if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN");
  if (!ws.trashedAt) return;

  await this.prisma.$transaction(async (tx) => {
    await tx.workspace.update({
      where: { id: wsId },
      data: { trashedAt: null },
    });
    await tx.timelineEvent.create({
      data: { workspaceId: wsId, eventType: "rfq.restored", actorUserId: actor.id, payload: {} },
    });
  });
};

// Re-export the (now-augmented) service so callers have one import.
export { RfqService } from "./rfq.service";
export { canAccessRfq } from "./rfq.policy";
