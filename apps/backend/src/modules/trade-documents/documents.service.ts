import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  TradeDocumentAction,
  TradeDocumentsSummary,
  TradeWorkspaceType,
} from "@dmx/contracts/trade-documents";
import { getDefaultRequirements } from "@dmx/contracts/document-requirements";
import {
  ApproveDocumentPayload,
  ExpireDocumentPayload,
  RejectDocumentPayload,
  RequestDocumentPayload,
  ReviewDocumentPayload,
  UploadDocumentPayload,
} from "@dmx/contracts/trade-documents.zod";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { AppError } from "../../utils/httpErrors.js";
import {
  assertDocumentActionRole,
  canAccessTradeWorkspace,
  type AuthUser,
} from "./documents.policy.js";
import { notifyDocumentEvent } from "./documents.notifications.js";
import { complianceAuditStatus } from "./compliance.js";
import { computeComplianceFromRows } from "./compliance-engine.js";
import { resolveTradeRoot } from "../trade/trade.resolver.js";

export class TradeDocumentsService {
  constructor(private readonly db: PrismaClient) {}

  async getSummary(
    workspaceType: TradeWorkspaceType,
    workspaceId: string,
  ): Promise<TradeDocumentsSummary> {
    await this.ensureRequirements(workspaceType, workspaceId);
    const [requirements, documents, reviews] = await Promise.all([
      this.db.documentRequirement.findMany({ where: { workspaceType, workspaceId } }),
      this.db.tradeDocument.findMany({ where: { workspaceType, workspaceId } }),
      this.db.documentReview.findMany({
        where: { document: { workspaceType, workspaceId } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    const compliance = computeComplianceFromRows(requirements, documents);
    return {
      workspaceType,
      workspaceId,
      requirements: requirements.map(mapReq),
      documents: documents.map(mapDoc),
      reviews: reviews.map(mapReview),
      compliance,
    };
  }

  async applyDocumentAction(
    workspaceType: TradeWorkspaceType,
    workspaceId: string,
    action: TradeDocumentAction,
    actor: AuthUser,
    payload: Record<string, unknown> = {},
    ctx?: { ip?: string; userAgent?: string },
  ): Promise<TradeDocumentsSummary> {
    if (!(await canAccessTradeWorkspace(this.db, actor, workspaceType, workspaceId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    try {
      assertDocumentActionRole(action, actor.role);
    } catch {
      throw new AppError(403, "FORBIDDEN_ROLE");
    }

    await this.ensureRequirements(workspaceType, workspaceId);

    switch (action) {
      case "request_document":
        await this.requestDocument(workspaceType, workspaceId, actor, RequestDocumentPayload.parse(payload), ctx);
        break;
      case "upload_document":
        await this.uploadDocument(workspaceType, workspaceId, actor, UploadDocumentPayload.parse(payload), ctx);
        break;
      case "review_document":
        await this.reviewDocument(workspaceType, workspaceId, actor, ReviewDocumentPayload.parse(payload), ctx);
        break;
      case "approve_document":
        await this.approveDocument(workspaceType, workspaceId, actor, ApproveDocumentPayload.parse(payload), ctx);
        break;
      case "reject_document":
        await this.rejectDocument(workspaceType, workspaceId, actor, RejectDocumentPayload.parse(payload), ctx);
        break;
      case "expire_document":
        await this.expireDocument(workspaceType, workspaceId, actor, ExpireDocumentPayload.parse(payload), ctx);
        break;
      default:
        throw new AppError(400, "UNKNOWN_ACTION");
    }

    const summary = await this.getSummary(workspaceType, workspaceId);
    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(workspaceId, SocketEvents.COMPLIANCE_UPDATED, {
        workspaceType,
        workspaceId,
        status: summary.compliance.status,
      });
    });
    return summary;
  }

  async ensureRequirements(workspaceType: TradeWorkspaceType, workspaceId: string) {
    const existing = await this.db.documentRequirement.count({
      where: { workspaceType, workspaceId },
    });
    if (existing > 0) return;
    const rules = getDefaultRequirements(workspaceType);
    await this.db.documentRequirement.createMany({
      data: rules.map((r) => ({
        workspaceType,
        workspaceId,
        documentType: r.documentType,
        required: r.required,
      })),
      skipDuplicates: true,
    });
    for (const r of rules) {
      await this.db.tradeDocument.upsert({
        where: {
          workspaceType_workspaceId_documentType: {
            workspaceType,
            workspaceId,
            documentType: r.documentType,
          },
        },
        create: {
          workspaceType,
          workspaceId,
          documentType: r.documentType,
          status: "MISSING",
          ownerRole: "SUPPLIER",
        },
        update: {},
      });
    }
  }

  private async requestDocument(
    workspaceType: TradeWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    input: RequestDocumentPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const doc = await this.upsertDoc(workspaceType, workspaceId, input.documentType, input.ownerRole);
    await this.db.$transaction(async (tx) => {
      await tx.tradeDocument.update({
        where: { id: doc.id },
        data: { status: "REQUESTED", ownerRole: input.ownerRole },
      });
      await this.audit(tx, workspaceId, actor, "document.requested", { documentType: input.documentType }, ctx);
      await this.timeline(tx, workspaceId, actor.id, "document.requested", { documentType: input.documentType });
    });
    this.emitDoc(SocketEvents.DOCUMENT_REQUESTED, workspaceType, workspaceId, doc.id);
  }

  private async uploadDocument(
    workspaceType: TradeWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    input: UploadDocumentPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const doc = await this.upsertDoc(workspaceType, workspaceId, input.documentType, input.ownerRole);
    const now = new Date();
    const root = await resolveTradeRoot(this.db, workspaceId).catch(() => null);
    await this.db.$transaction(async (tx) => {
      if (doc.fileId) {
        await tx.tradeDocumentVersion.updateMany({
          where: { tradeDocumentId: doc.id },
          data: { isLatest: false },
        });
        await tx.tradeDocumentVersion.create({
          data: {
            tradeDocumentId: doc.id,
            version: doc.version,
            fileId: doc.fileId,
            fileName: doc.fileName ?? doc.documentType,
            uploadedById: doc.uploadedById ?? actor.id,
            uploadedAt: doc.uploadedAt ?? now,
            isLatest: false,
          },
        });
      }
      const nextVersion = doc.fileId ? doc.version + 1 : doc.version;
      await tx.tradeDocument.update({
        where: { id: doc.id },
        data: {
          status: "UPLOADED",
          uploadedById: actor.id,
          fileId: input.fileId,
          fileName: input.fileName,
          uploadedAt: now,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          version: nextVersion,
          tradeRootId: root?.id ?? doc.tradeRootId,
        },
      });
      await tx.tradeDocumentVersion.create({
        data: {
          tradeDocumentId: doc.id,
          version: nextVersion,
          fileId: input.fileId,
          fileName: input.fileName,
          uploadedById: actor.id,
          uploadedAt: now,
          isLatest: true,
        },
      });
      await this.audit(tx, workspaceId, actor, "document.uploaded", {
        documentId: doc.id,
        documentType: input.documentType,
        fileId: input.fileId,
        version: nextVersion,
      }, ctx);
      await this.timeline(tx, workspaceId, actor.id, doc.fileId ? "document.reuploaded" : "document.uploaded", {
        documentId: doc.id,
        version: nextVersion,
      });
    });
    this.emitDoc(SocketEvents.DOCUMENT_UPLOADED, workspaceType, workspaceId, doc.id);
  }

  private async reviewDocument(
    workspaceType: TradeWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    input: ReviewDocumentPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const doc = await this.requireDoc(input.documentId, workspaceType, workspaceId);
    if (!["UPLOADED", "REJECTED"].includes(doc.status)) {
      throw new AppError(409, "INVALID_DOCUMENT_STATE");
    }
    await this.db.$transaction(async (tx) => {
      await tx.tradeDocument.update({ where: { id: doc.id }, data: { status: "UNDER_REVIEW" } });
      await tx.documentReview.create({
        data: { documentId: doc.id, reviewedById: actor.id, decision: "UNDER_REVIEW" },
      });
      await this.audit(tx, workspaceId, actor, "document.reviewed", { documentId: doc.id }, ctx);
      await this.timeline(tx, workspaceId, actor.id, "document.reviewed", { documentId: doc.id });
    });
  }

  private async approveDocument(
    workspaceType: TradeWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    input: ApproveDocumentPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const doc = await this.requireDoc(input.documentId, workspaceType, workspaceId);
    const now = new Date();
    await this.db.$transaction(async (tx) => {
      await tx.tradeDocument.update({
        where: { id: doc.id },
        data: { status: "APPROVED", approvedAt: now },
      });
      await tx.documentReview.create({
        data: {
          documentId: doc.id,
          reviewedById: actor.id,
          decision: "APPROVED",
          reason: input.reason,
        },
      });
      await this.audit(tx, workspaceId, actor, "document.approved", { documentId: doc.id }, ctx);
      await this.timeline(tx, workspaceId, actor.id, "document.approved", { documentId: doc.id });
      const summary = computeComplianceFromRows(
        await tx.documentRequirement.findMany({ where: { workspaceType, workspaceId } }),
        await tx.tradeDocument.findMany({ where: { workspaceType, workspaceId } }),
      );
      const ready = complianceAuditStatus(summary.status);
      if (ready) await this.audit(tx, workspaceId, actor, ready, { status: summary.status }, ctx);
    });
    this.emitDoc(SocketEvents.DOCUMENT_APPROVED, workspaceType, workspaceId, doc.id);
  }

  private async rejectDocument(
    workspaceType: TradeWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    input: RejectDocumentPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const doc = await this.requireDoc(input.documentId, workspaceType, workspaceId);
    await this.db.$transaction(async (tx) => {
      await tx.tradeDocument.update({ where: { id: doc.id }, data: { status: "REJECTED", approvedAt: null } });
      await tx.documentReview.create({
        data: {
          documentId: doc.id,
          reviewedById: actor.id,
          decision: "REJECTED",
          reason: input.reason,
        },
      });
      await this.audit(tx, workspaceId, actor, "document.rejected", {
        documentId: doc.id,
        reason: input.reason,
      }, ctx);
      await this.timeline(tx, workspaceId, actor.id, "document.rejected", { documentId: doc.id });
    });
    this.emitDoc(SocketEvents.DOCUMENT_REJECTED, workspaceType, workspaceId, doc.id);
  }

  private async expireDocument(
    workspaceType: TradeWorkspaceType,
    workspaceId: string,
    actor: AuthUser,
    input: ExpireDocumentPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const doc = await this.requireDoc(input.documentId, workspaceType, workspaceId);
    await this.db.$transaction(async (tx) => {
      await tx.tradeDocument.update({ where: { id: doc.id }, data: { status: "EXPIRED" } });
      await this.audit(tx, workspaceId, actor, "document.expired", { documentId: doc.id, reason: input.reason }, ctx);
    });
  }

  private async upsertDoc(
    workspaceType: TradeWorkspaceType,
    workspaceId: string,
    documentType: string,
    ownerRole: string,
  ) {
    return this.db.tradeDocument.upsert({
      where: {
        workspaceType_workspaceId_documentType: { workspaceType, workspaceId, documentType },
      },
      create: {
        workspaceType,
        workspaceId,
        documentType,
        status: "MISSING",
        ownerRole,
      },
      update: { ownerRole },
    });
  }

  private async requireDoc(id: string, workspaceType: TradeWorkspaceType, workspaceId: string) {
    const doc = await this.db.tradeDocument.findUnique({ where: { id } });
    if (!doc || doc.workspaceId !== workspaceId || doc.workspaceType !== workspaceType) {
      throw new AppError(404, "DOCUMENT_NOT_FOUND");
    }
    return doc;
  }

  private emitDoc(
    event: string,
    workspaceType: TradeWorkspaceType,
    workspaceId: string,
    documentId: string,
  ) {
    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(workspaceId, event, { workspaceType, workspaceId, documentId });
    });
  }

  private async audit(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    actor: AuthUser,
    action: string,
    payload: Record<string, unknown>,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const ws = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { state: true } });
    await tx.auditLog.create({
      data: {
        workspaceId,
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action,
        fromState: ws.state,
        toState: ws.state,
        payload: payload as Prisma.InputJsonValue,
        ipAddress: ctx?.ip,
        userAgent: ctx?.userAgent,
      },
    });
  }

  private async timeline(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    actorUserId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    await tx.timelineEvent.create({
      data: {
        workspaceId,
        eventType,
        actorUserId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }
}

function mapReq(r: {
  id: string;
  workspaceType: string;
  workspaceId: string;
  documentType: string;
  required: boolean;
  createdAt: Date;
}) {
  return {
    id: r.id,
    workspaceType: r.workspaceType as TradeWorkspaceType,
    workspaceId: r.workspaceId,
    documentType: r.documentType as TradeDocumentsSummary["requirements"][number]["documentType"],
    required: r.required,
    createdAt: r.createdAt.toISOString(),
  };
}

function mapDoc(d: {
  id: string;
  workspaceType: string;
  workspaceId: string;
  documentType: string;
  status: string;
  ownerRole: string;
  uploadedById: string | null;
  fileId: string | null;
  fileName: string | null;
  uploadedAt: Date | null;
  approvedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: d.id,
    workspaceType: d.workspaceType as TradeWorkspaceType,
    workspaceId: d.workspaceId,
    documentType: d.documentType as TradeDocumentsSummary["documents"][number]["documentType"],
    status: d.status as TradeDocumentsSummary["documents"][number]["status"],
    ownerRole: d.ownerRole as TradeDocumentsSummary["documents"][number]["ownerRole"],
    uploadedById: d.uploadedById,
    fileId: d.fileId,
    fileName: d.fileName,
    uploadedAt: d.uploadedAt?.toISOString() ?? null,
    approvedAt: d.approvedAt?.toISOString() ?? null,
    expiresAt: d.expiresAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

function mapReview(r: {
  id: string;
  documentId: string;
  reviewedById: string;
  decision: string;
  reason: string | null;
  createdAt: Date;
}) {
  return {
    id: r.id,
    documentId: r.documentId,
    reviewedById: r.reviewedById,
    decision: r.decision as "APPROVED" | "REJECTED" | "UNDER_REVIEW",
    reason: r.reason,
    createdAt: r.createdAt.toISOString(),
  };
}
