import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import {
  CustomsCaseListQuerySchema,
  EnsureCustomsCaseSchema,
  PlaceCustomsHoldSchema,
  RecordDeclarationSchema,
  ResolveCustomsHoldSchema,
  TransitionCustomsCaseSchema,
} from "@dmx/contracts/customs";
import {
  BrokerHoldSchema,
  RequestCustomsDocumentSchema,
  RequestCustomsInformationSchema,
  StartBrokerReviewSchema,
  VerifyClassificationSchema,
} from "@dmx/contracts/customs-broker-execution";
import {
  DutyTaxCalculateSchema,
  DutyTaxOverrideSchema,
  DutyTaxReviewSchema,
  DutyTaxRuleUpsertSchema,
} from "@dmx/contracts/duty-tax";
import { customsController } from "./customs.controller.js";
import { dutyTaxCalcLimiter } from "../../middleware/rate-limit.js";

export const customsRouter = Router();

const managers = [
  "BUYER",
  "ADMIN",
  "SUPER_ADMIN",
  "OPS_MANAGER",
  "LOGISTICS_OPERATOR",
  "DOCUMENT_CONTROLLER",
] as const;

const managersAndBroker = [...managers, "CUSTOMS_BROKER"] as const;
const brokerActors = ["CUSTOMS_BROKER", "ADMIN", "SUPER_ADMIN", "OPS_MANAGER"] as const;
/** Generic case mutations — ops/broker only (not Buyer). FSM alone is not authorization. */
const customsMutationActors = [
  "CUSTOMS_BROKER",
  "ADMIN",
  "SUPER_ADMIN",
  "OPS_MANAGER",
  "LOGISTICS_OPERATOR",
  "DOCUMENT_CONTROLLER",
] as const;

customsRouter.get(
  "/cases",
  requireAuth,
  requireRole(...managers),
  validateQuery(CustomsCaseListQuerySchema),
  asyncHandler(customsController.list),
);

customsRouter.post(
  "/cases/ensure",
  requireAuth,
  requireRole(...managers),
  validateBody(EnsureCustomsCaseSchema),
  asyncHandler(customsController.ensure),
);

customsRouter.get(
  "/cases/:id",
  requireAuth,
  requireRole(...managersAndBroker),
  asyncHandler(customsController.get),
);

customsRouter.get(
  "/cases/:id/readiness",
  requireAuth,
  requireRole(...managersAndBroker),
  asyncHandler(customsController.readiness),
);

customsRouter.get(
  "/cases/:id/events",
  requireAuth,
  requireRole(...managersAndBroker),
  asyncHandler(customsController.events),
);

customsRouter.post(
  "/cases/:id/transition",
  requireAuth,
  requireRole(...customsMutationActors),
  validateBody(TransitionCustomsCaseSchema),
  asyncHandler(customsController.transition),
);

customsRouter.post(
  "/cases/:id/hold",
  requireAuth,
  requireRole(...customsMutationActors),
  validateBody(PlaceCustomsHoldSchema),
  asyncHandler(customsController.placeHold),
);

customsRouter.post(
  "/cases/:id/resolve-hold",
  requireAuth,
  requireRole(...customsMutationActors),
  validateBody(ResolveCustomsHoldSchema),
  asyncHandler(customsController.resolveHold),
);

customsRouter.post(
  "/cases/:id/declaration",
  requireAuth,
  requireRole(...customsMutationActors),
  validateBody(RecordDeclarationSchema),
  asyncHandler(customsController.recordDeclaration),
);

customsRouter.post(
  "/cases/:id/sync-broker",
  requireAuth,
  requireRole(...managers),
  asyncHandler(customsController.syncBroker),
);

/** Sprint 39 — Customs Broker Execution (assignment-scoped) */
customsRouter.post(
  "/cases/:id/start-review",
  requireAuth,
  requireRole(...brokerActors),
  validateBody(StartBrokerReviewSchema),
  asyncHandler(customsController.startReview),
);

customsRouter.post(
  "/cases/:id/verify-classification",
  requireAuth,
  requireRole(...brokerActors),
  validateBody(VerifyClassificationSchema),
  asyncHandler(customsController.verifyClassification),
);

customsRouter.post(
  "/cases/:id/request-document",
  requireAuth,
  requireRole(...brokerActors),
  validateBody(RequestCustomsDocumentSchema),
  asyncHandler(customsController.requestDocument),
);

customsRouter.post(
  "/cases/:id/request-information",
  requireAuth,
  requireRole(...brokerActors),
  validateBody(RequestCustomsInformationSchema),
  asyncHandler(customsController.requestInformation),
);

customsRouter.post(
  "/cases/:id/start-declaration-preparation",
  requireAuth,
  requireRole(...brokerActors),
  asyncHandler(customsController.startDeclarationPreparation),
);

customsRouter.post(
  "/cases/:id/start-customs-processing",
  requireAuth,
  requireRole(...brokerActors),
  asyncHandler(customsController.startCustomsProcessing),
);

customsRouter.post(
  "/cases/:id/mark-clearance-pending",
  requireAuth,
  requireRole(...brokerActors),
  asyncHandler(customsController.markClearancePending),
);

customsRouter.post(
  "/cases/:id/mark-cleared",
  requireAuth,
  requireRole(...brokerActors),
  asyncHandler(customsController.markCleared),
);

customsRouter.post(
  "/cases/:id/broker-hold",
  requireAuth,
  requireRole(...brokerActors),
  validateBody(BrokerHoldSchema),
  asyncHandler(customsController.brokerHold),
);

customsRouter.get(
  "/shipments/:shipmentWorkspaceId",
  requireAuth,
  requireRole(...managersAndBroker),
  asyncHandler(customsController.byShipment),
);

customsRouter.get(
  "/shipments/:shipmentWorkspaceId/eligibility",
  requireAuth,
  requireRole(...managersAndBroker),
  asyncHandler(customsController.eligibility),
);

/** Sprint 40 — Duty & Tax estimation (not official liability) */
customsRouter.get(
  "/cases/:id/duty-tax",
  requireAuth,
  requireRole(...managersAndBroker),
  asyncHandler(customsController.getDutyTax),
);

customsRouter.post(
  "/cases/:id/duty-tax/calculate",
  requireAuth,
  requireRole(...brokerActors),
  dutyTaxCalcLimiter,
  validateBody(DutyTaxCalculateSchema),
  asyncHandler(customsController.calculateDutyTax),
);

customsRouter.post(
  "/cases/:id/duty-tax/recalculate",
  requireAuth,
  requireRole(...brokerActors),
  dutyTaxCalcLimiter,
  validateBody(DutyTaxCalculateSchema),
  asyncHandler(customsController.recalculateDutyTax),
);

customsRouter.post(
  "/cases/:id/duty-tax/review",
  requireAuth,
  requireRole(...brokerActors),
  validateBody(DutyTaxReviewSchema),
  asyncHandler(customsController.reviewDutyTax),
);

customsRouter.post(
  "/cases/:id/duty-tax/override",
  requireAuth,
  requireRole(...brokerActors),
  validateBody(DutyTaxOverrideSchema),
  asyncHandler(customsController.overrideDutyTax),
);

customsRouter.get(
  "/cases/:id/duty-tax/versions",
  requireAuth,
  requireRole(...managersAndBroker),
  asyncHandler(customsController.listDutyTaxVersions),
);

customsRouter.get(
  "/cases/:id/duty-tax/:calculationId",
  requireAuth,
  requireRole(...managersAndBroker),
  asyncHandler(customsController.getDutyTaxVersion),
);

customsRouter.get(
  "/duty-tax/rules",
  requireAuth,
  requireRole(...managersAndBroker),
  asyncHandler(customsController.listDutyTaxRules),
);

customsRouter.post(
  "/duty-tax/rules",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "OPS_MANAGER"),
  validateBody(DutyTaxRuleUpsertSchema),
  asyncHandler(customsController.upsertDutyTaxRule),
);
