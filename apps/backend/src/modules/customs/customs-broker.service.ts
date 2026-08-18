/**
 * Sprint 39 — Customs Broker Execution actions (assignment-scoped).
 * Attribution: CUSTOMS_BROKER. Not government filing / not DeMaxtore legal representation.
 */
import type { PrismaClient } from "@prisma/client";
import {
  computeCustomsBrokerAllowedActions,
  type BrokerHoldInput,
  type RequestCustomsDocumentInput,
  type RequestCustomsInformationInput,
  type StartBrokerReviewInput,
  type VerifyClassificationInput,
} from "@dmx/contracts/customs-broker-execution";
import type { CustomsCaseDto } from "@dmx/contracts/customs";
import { AppError } from "../../utils/httpErrors.js";
import type { AuthUser } from "../../types/auth-user.js";
import { OperationalIssueService } from "../operational-issue/operational-issue.service.js";
import { OperationalTaskService } from "../operational-task/operational-task.service.js";
import { TradeDocumentsService } from "../trade-documents/documents.service.js";
import { assertCustomsCaseAccess } from "./customs.policy.js";
import { createCustomsService } from "./customs.service.js";

function mapOwnerRole(
  role: string,
): "OPERATIONS" | "DOCUMENTATION" | "CUSTOMER" | "SUPPLIER" {
  if (role === "SUPPLIER") return "SUPPLIER";
  if (role === "DOCUMENTATION") return "DOCUMENTATION";
  if (role === "OPERATIONS") return "OPERATIONS";
  return "CUSTOMER";
}

export function createCustomsBrokerService(db: PrismaClient) {
  const customs = createCustomsService(db);
  const issues = new OperationalIssueService(db);
  const tasks = new OperationalTaskService(db);
  const tradeDocs = new TradeDocumentsService(db);

  async function requireBrokerCase(actor: AuthUser, caseId: string) {
    const row = await db.customsCase.findUnique({ where: { id: caseId } });
    if (!row) throw new AppError(404, "CUSTOMS_CASE_NOT_FOUND");
    const access = await assertCustomsCaseAccess(db, actor, row);
    if (access !== "BROKER" && access !== "OPS") {
      // Buyers may view; mutations here are broker/ops execution
      if (String(actor.role) !== "CUSTOMS_BROKER") {
        throw new AppError(403, "BROKER_ACTION_FORBIDDEN");
      }
    }
    if (String(actor.role) === "CUSTOMS_BROKER" && access !== "BROKER") {
      throw new AppError(403, "PARTNER_NOT_ASSIGNED");
    }
    return row;
  }

  async function withAllowed(dto: CustomsCaseDto): Promise<CustomsCaseDto> {
    return {
      ...dto,
      allowedActions: computeCustomsBrokerAllowedActions({
        status: dto.status,
        readinessStatus: dto.readinessStatus,
        blockingCount: dto.readiness?.blockingCount ?? dto.preArrival?.blockingCount ?? 0,
        hasDeclarationRef: !!dto.declarationReference,
      }),
    };
  }

  async function reevalPreArrival(shipmentWorkspaceId: string) {
    void import("./pre-arrival-customs.service.js")
      .then(({ createPreArrivalCustomsService }) =>
        createPreArrivalCustomsService(db).safeEvaluateShipment(shipmentWorkspaceId),
      )
      .catch(() => undefined);
  }

  return {
    async getWithActions(actor: AuthUser, caseId: string): Promise<CustomsCaseDto> {
      const dto = await customs.get(actor, caseId);
      return withAllowed(dto);
    },

    async startReview(
      actor: AuthUser,
      caseId: string,
      input: StartBrokerReviewInput = {},
    ): Promise<CustomsCaseDto> {
      const row = await requireBrokerCase(actor, caseId);
      if (row.status === "BROKER_REVIEW") {
        return withAllowed(await customs.get(actor, caseId));
      }

      // Advance through valid path toward BROKER_REVIEW
      let current = row.status;
      const reason = input.reason ?? "Broker started review";
      if (current === "DRAFT") {
        await customs.transition(actor, caseId, { toStatus: "PREPARING", reason, source: "CUSTOMS_BROKER" });
        current = "PREPARING";
      }
      if (current === "PREPARING") {
        await customs.transition(actor, caseId, {
          toStatus: "READY_FOR_BROKER",
          reason,
          source: "CUSTOMS_BROKER",
        });
        current = "READY_FOR_BROKER";
      }
      if (current === "READY_FOR_BROKER") {
        await customs.transition(actor, caseId, {
          toStatus: "BROKER_REVIEW",
          reason,
          source: "CUSTOMS_BROKER",
        });
      } else {
        // BROKER_REVIEW already returned above; anything else cannot reach review.
        throw new AppError(409, `INVALID_CUSTOMS_TRANSITION:${current}->BROKER_REVIEW`);
      }

      await db.customsCaseEvent.create({
        data: {
          customsCaseId: caseId,
          actorUserId: actor.id,
          source: "CUSTOMS_BROKER",
          fromStatus: row.status,
          toStatus: "BROKER_REVIEW",
          reason: "BROKER_REVIEW_STARTED",
          payload: { action: "START_REVIEW" },
        },
      });
      await reevalPreArrival(row.shipmentWorkspaceId);
      return withAllowed(await customs.get(actor, caseId));
    },

    async verifyClassification(
      actor: AuthUser,
      caseId: string,
      input: VerifyClassificationInput,
    ): Promise<CustomsCaseDto> {
      const row = await requireBrokerCase(actor, caseId);
      if (String(actor.role) !== "CUSTOMS_BROKER" && String(actor.role) !== "ADMIN" && String(actor.role) !== "SUPER_ADMIN" && String(actor.role) !== "OPS_MANAGER") {
        throw new AppError(403, "BROKER_ACTION_FORBIDDEN");
      }

      // Product must be on this case's shipment allocations
      const onCase = await db.shipmentLineAllocation.findFirst({
        where: {
          shipmentWorkspaceId: row.shipmentWorkspaceId,
          purchaseOrderLine: { productId: input.productId },
        },
        select: { id: true },
      });
      if (!onCase) throw new AppError(403, "PRODUCT_NOT_ON_CUSTOMS_CASE");

      const product = await db.product.findUnique({ where: { id: input.productId } });
      if (!product) throw new AppError(404, "PRODUCT_NOT_FOUND");
      if (product.organisationId !== row.organisationId) {
        throw new AppError(403, "PRODUCT_FORBIDDEN");
      }

      const gtip = input.gtipCode.trim();
      const prev = {
        gtipCode: product.gtipCode,
        classificationStatus: product.classificationStatus,
        classificationSource: product.classificationSource,
        customsDescription: product.customsDescription,
      };

      await db.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: product.id },
          data: {
            gtipCode: gtip,
            classificationStatus: "VERIFIED",
            classificationSource: "CUSTOMS_BROKER_VERIFIED",
            customsDescription:
              input.customsDescription?.trim() || product.customsDescription,
            classificationNotes: input.reviewNote?.trim() || product.classificationNotes,
            classificationUpdatedAt: new Date(),
            classificationUpdatedById: actor.id,
            updatedById: actor.id,
          },
        });
        await tx.productChangeEvent.create({
          data: {
            productId: product.id,
            actorUserId: actor.id,
            field: "classification",
            fromValue: JSON.stringify(prev),
            toValue: JSON.stringify({
              gtipCode: gtip,
              classificationStatus: "VERIFIED",
              classificationSource: "CUSTOMS_BROKER_VERIFIED",
            }),
            reason: input.reviewNote?.trim() || "Broker verified classification",
          },
        });
        await tx.customsCaseEvent.create({
          data: {
            customsCaseId: caseId,
            actorUserId: actor.id,
            source: "CUSTOMS_BROKER",
            fromStatus: row.status,
            toStatus: row.status,
            reason: "CLASSIFICATION_VERIFIED",
            payload: {
              action: "VERIFY_CLASSIFICATION",
              productId: product.id,
              previous: prev,
              next: {
                gtipCode: gtip,
                classificationStatus: "VERIFIED",
                classificationSource: "CUSTOMS_BROKER_VERIFIED",
              },
              note: "Broker Verified — Product Master updated with provenance; not a government determination.",
            },
          },
        });
      });

      await customs.readiness(actor, caseId);
      await reevalPreArrival(row.shipmentWorkspaceId);
      return withAllowed(await customs.get(actor, caseId));
    },

    async requestDocument(
      actor: AuthUser,
      caseId: string,
      input: RequestCustomsDocumentInput,
    ): Promise<CustomsCaseDto> {
      const row = await requireBrokerCase(actor, caseId);
      const key = `customs_broker_doc_request:${caseId}:${input.documentType}`;
      const owner = mapOwnerRole(input.ownerRole);

      const task = await tasks.ensureAutomatedTask({
        orderId: row.orderWorkspaceId,
        automationKey: `task:${key}`,
        title: `Customs document requested: ${input.documentType}`,
        description: input.reason,
        priority: "HIGH",
        relatedEntityType: "DOCUMENT",
        relatedEntityId: row.shipmentWorkspaceId,
        dueInDays: 2,
        actorUserId: actor.id,
      });

      await issues.ensureAutomatedIssue({
        orderId: row.orderWorkspaceId,
        automationKey: key,
        title: `Customs broker requested document — ${input.documentType}`,
        description: input.reason,
        category: "DOCUMENT_MISSING",
        severity: "HIGH",
        relatedEntityType: "SHIPMENT",
        relatedEntityId: row.shipmentWorkspaceId,
        assignedTaskId: task.id,
        impactType: "CUSTOMS_RISK",
        ownerRole: owner,
        recommendedAction: `Provide/upload ${input.documentType}`,
        sourceEventType: "DOCUMENT_MISSING",
        sourceRuleId: "RULE_CUSTOMS_BROKER_DOCUMENT_REQUEST",
        actorUserId: actor.id,
      });

      // Best-effort trade-document request on shipment workspace
      try {
        await tradeDocs.applyDocumentAction(
          "SHIPMENT",
          row.shipmentWorkspaceId,
          "request_document",
          actor,
          { documentType: input.documentType, notes: input.reason },
        );
      } catch {
        /* issue/task already created */
      }

      await db.customsCaseEvent.create({
        data: {
          customsCaseId: caseId,
          actorUserId: actor.id,
          source: "CUSTOMS_BROKER",
          fromStatus: row.status,
          toStatus: row.status,
          reason: "DOCUMENT_REQUESTED",
          payload: {
            action: "REQUEST_DOCUMENT",
            documentType: input.documentType,
            ownerRole: input.ownerRole,
          },
        },
      });

      await customs.readiness(actor, caseId);
      await reevalPreArrival(row.shipmentWorkspaceId);
      return withAllowed(await customs.get(actor, caseId));
    },

    async requestInformation(
      actor: AuthUser,
      caseId: string,
      input: RequestCustomsInformationInput,
    ): Promise<CustomsCaseDto> {
      const row = await requireBrokerCase(actor, caseId);
      const key = `customs_broker_info_request:${caseId}:${input.category}:${input.title.slice(0, 40)}`;
      const owner = mapOwnerRole(input.ownerRole);

      const task = await tasks.ensureAutomatedTask({
        orderId: row.orderWorkspaceId,
        automationKey: `task:${key}`,
        title: input.title,
        description: input.description,
        priority: "HIGH",
        relatedEntityType: "ORDER",
        relatedEntityId: row.orderWorkspaceId,
        dueInDays: 2,
        actorUserId: actor.id,
      });

      await issues.ensureAutomatedIssue({
        orderId: row.orderWorkspaceId,
        automationKey: key,
        title: `Customs information requested — ${input.category}`,
        description: `${input.title}\n\n${input.description}`,
        category: "OTHER",
        severity: "MEDIUM",
        relatedEntityType: "SHIPMENT",
        relatedEntityId: row.shipmentWorkspaceId,
        assignedTaskId: task.id,
        impactType: "CUSTOMS_RISK",
        ownerRole: owner,
        recommendedAction: input.title,
        sourceEventType: "CUSTOMS_HOLD",
        sourceRuleId: "RULE_CUSTOMS_BROKER_INFO_REQUEST",
        actorUserId: actor.id,
      });

      await db.customsCaseEvent.create({
        data: {
          customsCaseId: caseId,
          actorUserId: actor.id,
          source: "CUSTOMS_BROKER",
          fromStatus: row.status,
          toStatus: row.status,
          reason: "INFORMATION_REQUESTED",
          payload: {
            action: "REQUEST_INFORMATION",
            category: input.category,
            productId: input.productId ?? null,
            ownerRole: input.ownerRole,
          },
        },
      });

      await reevalPreArrival(row.shipmentWorkspaceId);
      return withAllowed(await customs.get(actor, caseId));
    },

    async startDeclarationPreparation(actor: AuthUser, caseId: string): Promise<CustomsCaseDto> {
      await requireBrokerCase(actor, caseId);
      const dto = await customs.transition(actor, caseId, {
        toStatus: "DECLARATION_PREPARING",
        reason: "DECLARATION_PREPARATION_STARTED",
        source: "CUSTOMS_BROKER",
      });
      return withAllowed(dto);
    },

    async startCustomsProcessing(actor: AuthUser, caseId: string): Promise<CustomsCaseDto> {
      await requireBrokerCase(actor, caseId);
      const dto = await customs.transition(actor, caseId, {
        toStatus: "CUSTOMS_PROCESSING",
        reason: "CUSTOMS_PROCESSING_STARTED — broker-reported operational status",
        source: "CUSTOMS_BROKER",
      });
      return withAllowed(dto);
    },

    async markClearancePending(actor: AuthUser, caseId: string): Promise<CustomsCaseDto> {
      await requireBrokerCase(actor, caseId);
      const dto = await customs.transition(actor, caseId, {
        toStatus: "CLEARANCE_PENDING",
        reason: "CLEARANCE_PENDING — broker-reported",
        source: "CUSTOMS_BROKER",
      });
      return withAllowed(dto);
    },

    async markCleared(actor: AuthUser, caseId: string): Promise<CustomsCaseDto> {
      const row = await requireBrokerCase(actor, caseId);
      // Allow from CLEARANCE_PENDING or CUSTOMS_PROCESSING via valid path
      if (row.status === "CUSTOMS_PROCESSING") {
        await customs.transition(actor, caseId, {
          toStatus: "CLEARANCE_PENDING",
          reason: "Auto-advance before broker-reported clearance",
          source: "CUSTOMS_BROKER",
        });
      }
      const dto = await customs.transition(actor, caseId, {
        toStatus: "CLEARED",
        reason: "MARK_CLEARED — Broker Reported Cleared (not government-confirmed)",
        source: "CUSTOMS_BROKER",
      });
      await db.customsCaseEvent.create({
        data: {
          customsCaseId: caseId,
          actorUserId: actor.id,
          source: "CUSTOMS_BROKER",
          fromStatus: "CLEARANCE_PENDING",
          toStatus: "CLEARED",
          reason: "CUSTOMS_CLEARED",
          payload: {
            action: "MARK_CLEARED",
            wording: "Broker Reported Cleared",
          },
        },
      });
      return withAllowed(dto);
    },

    async placeHold(actor: AuthUser, caseId: string, input: BrokerHoldInput): Promise<CustomsCaseDto> {
      const row = await requireBrokerCase(actor, caseId);
      const dto = await customs.placeHold(actor, caseId, {
        category: input.category,
        reason: input.reason,
      });
      const key = `customs_broker_hold:${caseId}:${input.category}`;
      const owner = mapOwnerRole(input.ownerRole ?? "BUYER");
      const task = await tasks.ensureAutomatedTask({
        orderId: row.orderWorkspaceId,
        automationKey: `task:${key}`,
        title: `Customs hold — ${input.category}`,
        description: input.recommendedAction || input.reason,
        priority: "CRITICAL",
        relatedEntityType: "SHIPMENT",
        relatedEntityId: row.shipmentWorkspaceId,
        dueInDays: 1,
        actorUserId: actor.id,
      });
      await issues.ensureAutomatedIssue({
        orderId: row.orderWorkspaceId,
        automationKey: key,
        title: `Customs HOLD — ${input.category}`,
        description: input.reason,
        category: "OTHER",
        severity: "CRITICAL",
        relatedEntityType: "SHIPMENT",
        relatedEntityId: row.shipmentWorkspaceId,
        assignedTaskId: task.id,
        impactType: "CUSTOMS_RISK",
        ownerRole: owner,
        recommendedAction: input.recommendedAction || input.reason,
        sourceEventType: "CUSTOMS_HOLD",
        sourceRuleId: "RULE_CUSTOMS_HOLD",
        actorUserId: actor.id,
      });
      return withAllowed(dto);
    },
  };
}

export type CustomsBrokerService = ReturnType<typeof createCustomsBrokerService>;
