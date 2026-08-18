import type { Request, Response } from "express";
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
import { prisma } from "../../db/prisma.js";
import type { AuthUser } from "../../types/auth-user.js";
import { createCustomsBrokerService } from "./customs-broker.service.js";
import { createCustomsService } from "./customs.service.js";
import { createDutyTaxService } from "./duty-tax.service.js";

function user(req: Request): AuthUser {
  return req.user as AuthUser;
}

const svc = createCustomsService(prisma);
const broker = createCustomsBrokerService(prisma);
const dutyTax = createDutyTaxService(prisma);

export const customsController = {
  async list(req: Request, res: Response) {
    const query = CustomsCaseListQuerySchema.parse(req.query);
    res.json(await svc.list(user(req), query));
  },

  async get(req: Request, res: Response) {
    // Include Sprint 39 broker allowedActions for CustomsCasePage execution UI.
    res.json(await broker.getWithActions(user(req), req.params.id));
  },

  async ensure(req: Request, res: Response) {
    const body = EnsureCustomsCaseSchema.parse(req.body ?? {});
    const row = await svc.ensure(user(req), body);
    res.status(201).json(row);
  },

  async readiness(req: Request, res: Response) {
    res.json(await svc.readiness(user(req), req.params.id));
  },

  async transition(req: Request, res: Response) {
    const body = TransitionCustomsCaseSchema.parse(req.body ?? {});
    res.json(await svc.transition(user(req), req.params.id, body));
  },

  async placeHold(req: Request, res: Response) {
    const body = PlaceCustomsHoldSchema.parse(req.body ?? {});
    res.json(await svc.placeHold(user(req), req.params.id, body));
  },

  async resolveHold(req: Request, res: Response) {
    const body = ResolveCustomsHoldSchema.parse(req.body ?? {});
    res.json(await svc.resolveHold(user(req), req.params.id, body));
  },

  async recordDeclaration(req: Request, res: Response) {
    const body = RecordDeclarationSchema.parse(req.body ?? {});
    res.json(await svc.recordDeclaration(user(req), req.params.id, body));
  },

  async syncBroker(req: Request, res: Response) {
    res.json(await svc.syncBroker(user(req), req.params.id));
  },

  async events(req: Request, res: Response) {
    res.json(await svc.events(user(req), req.params.id));
  },

  async byShipment(req: Request, res: Response) {
    const row = await svc.getByShipment(user(req), req.params.shipmentWorkspaceId);
    res.json(row);
  },

  async eligibility(req: Request, res: Response) {
    res.json(await svc.eligibility(user(req), req.params.shipmentWorkspaceId));
  },

  async getDutyTax(req: Request, res: Response) {
    res.json(await dutyTax.getCurrent(user(req), req.params.id));
  },

  async calculateDutyTax(req: Request, res: Response) {
    const body = DutyTaxCalculateSchema.parse(req.body ?? {});
    res.status(201).json(await dutyTax.calculate(user(req), req.params.id, body));
  },

  async recalculateDutyTax(req: Request, res: Response) {
    const body = DutyTaxCalculateSchema.parse(req.body ?? {});
    res.status(201).json(await dutyTax.calculate(user(req), req.params.id, body));
  },

  async reviewDutyTax(req: Request, res: Response) {
    const body = DutyTaxReviewSchema.parse(req.body ?? {});
    res.json(await dutyTax.review(user(req), req.params.id, body));
  },

  async overrideDutyTax(req: Request, res: Response) {
    const body = DutyTaxOverrideSchema.parse(req.body ?? {});
    res.json(await dutyTax.override(user(req), req.params.id, body));
  },

  async listDutyTaxVersions(req: Request, res: Response) {
    res.json({ items: await dutyTax.listVersions(user(req), req.params.id) });
  },

  async getDutyTaxVersion(req: Request, res: Response) {
    res.json(await dutyTax.getById(user(req), req.params.id, req.params.calculationId));
  },

  async listDutyTaxRules(req: Request, res: Response) {
    res.json({ items: await dutyTax.listRules(user(req)) });
  },

  async upsertDutyTaxRule(req: Request, res: Response) {
    const body = DutyTaxRuleUpsertSchema.parse(req.body ?? {});
    res.status(201).json(await dutyTax.upsertRule(user(req), body));
  },

  /** Sprint 39 — Customs Broker Execution */
  async startReview(req: Request, res: Response) {
    const body = StartBrokerReviewSchema.parse(req.body ?? {});
    res.json(await broker.startReview(user(req), req.params.id, body));
  },

  async verifyClassification(req: Request, res: Response) {
    const body = VerifyClassificationSchema.parse(req.body ?? {});
    res.json(await broker.verifyClassification(user(req), req.params.id, body));
  },

  async requestDocument(req: Request, res: Response) {
    const body = RequestCustomsDocumentSchema.parse(req.body ?? {});
    res.json(await broker.requestDocument(user(req), req.params.id, body));
  },

  async requestInformation(req: Request, res: Response) {
    const body = RequestCustomsInformationSchema.parse(req.body ?? {});
    res.json(await broker.requestInformation(user(req), req.params.id, body));
  },

  async startDeclarationPreparation(req: Request, res: Response) {
    res.json(await broker.startDeclarationPreparation(user(req), req.params.id));
  },

  async startCustomsProcessing(req: Request, res: Response) {
    res.json(await broker.startCustomsProcessing(user(req), req.params.id));
  },

  async markClearancePending(req: Request, res: Response) {
    res.json(await broker.markClearancePending(user(req), req.params.id));
  },

  async markCleared(req: Request, res: Response) {
    res.json(await broker.markCleared(user(req), req.params.id));
  },

  async brokerHold(req: Request, res: Response) {
    const body = BrokerHoldSchema.parse(req.body ?? {});
    res.json(await broker.placeHold(user(req), req.params.id, body));
  },
};
