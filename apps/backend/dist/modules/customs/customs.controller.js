import { CustomsCaseListQuerySchema, EnsureCustomsCaseSchema, PlaceCustomsHoldSchema, RecordDeclarationSchema, ResolveCustomsHoldSchema, TransitionCustomsCaseSchema, } from "@dmx/contracts/customs";
import { BrokerHoldSchema, RequestCustomsDocumentSchema, RequestCustomsInformationSchema, StartBrokerReviewSchema, VerifyClassificationSchema, } from "@dmx/contracts/customs-broker-execution";
import { DutyTaxCalculateSchema, DutyTaxOverrideSchema, DutyTaxReviewSchema, DutyTaxRuleUpsertSchema, } from "@dmx/contracts/duty-tax";
import { prisma } from "../../db/prisma.js";
import { createCustomsBrokerService } from "./customs-broker.service.js";
import { createCustomsService } from "./customs.service.js";
import { createDutyTaxService } from "./duty-tax.service.js";
function user(req) {
    return req.user;
}
const svc = createCustomsService(prisma);
const broker = createCustomsBrokerService(prisma);
const dutyTax = createDutyTaxService(prisma);
export const customsController = {
    async list(req, res) {
        const query = CustomsCaseListQuerySchema.parse(req.query);
        res.json(await svc.list(user(req), query));
    },
    async get(req, res) {
        // Include Sprint 39 broker allowedActions for CustomsCasePage execution UI.
        res.json(await broker.getWithActions(user(req), req.params.id));
    },
    async ensure(req, res) {
        const body = EnsureCustomsCaseSchema.parse(req.body ?? {});
        const row = await svc.ensure(user(req), body);
        res.status(201).json(row);
    },
    async readiness(req, res) {
        res.json(await svc.readiness(user(req), req.params.id));
    },
    async transition(req, res) {
        const body = TransitionCustomsCaseSchema.parse(req.body ?? {});
        res.json(await svc.transition(user(req), req.params.id, body));
    },
    async placeHold(req, res) {
        const body = PlaceCustomsHoldSchema.parse(req.body ?? {});
        res.json(await svc.placeHold(user(req), req.params.id, body));
    },
    async resolveHold(req, res) {
        const body = ResolveCustomsHoldSchema.parse(req.body ?? {});
        res.json(await svc.resolveHold(user(req), req.params.id, body));
    },
    async recordDeclaration(req, res) {
        const body = RecordDeclarationSchema.parse(req.body ?? {});
        res.json(await svc.recordDeclaration(user(req), req.params.id, body));
    },
    async syncBroker(req, res) {
        res.json(await svc.syncBroker(user(req), req.params.id));
    },
    async events(req, res) {
        res.json(await svc.events(user(req), req.params.id));
    },
    async byShipment(req, res) {
        const row = await svc.getByShipment(user(req), req.params.shipmentWorkspaceId);
        res.json(row);
    },
    async eligibility(req, res) {
        res.json(await svc.eligibility(user(req), req.params.shipmentWorkspaceId));
    },
    async getDutyTax(req, res) {
        res.json(await dutyTax.getCurrent(user(req), req.params.id));
    },
    async calculateDutyTax(req, res) {
        const body = DutyTaxCalculateSchema.parse(req.body ?? {});
        res.status(201).json(await dutyTax.calculate(user(req), req.params.id, body));
    },
    async recalculateDutyTax(req, res) {
        const body = DutyTaxCalculateSchema.parse(req.body ?? {});
        res.status(201).json(await dutyTax.calculate(user(req), req.params.id, body));
    },
    async reviewDutyTax(req, res) {
        const body = DutyTaxReviewSchema.parse(req.body ?? {});
        res.json(await dutyTax.review(user(req), req.params.id, body));
    },
    async overrideDutyTax(req, res) {
        const body = DutyTaxOverrideSchema.parse(req.body ?? {});
        res.json(await dutyTax.override(user(req), req.params.id, body));
    },
    async listDutyTaxVersions(req, res) {
        res.json({ items: await dutyTax.listVersions(user(req), req.params.id) });
    },
    async getDutyTaxVersion(req, res) {
        res.json(await dutyTax.getById(user(req), req.params.id, req.params.calculationId));
    },
    async listDutyTaxRules(req, res) {
        res.json({ items: await dutyTax.listRules(user(req)) });
    },
    async upsertDutyTaxRule(req, res) {
        const body = DutyTaxRuleUpsertSchema.parse(req.body ?? {});
        res.status(201).json(await dutyTax.upsertRule(user(req), body));
    },
    /** Sprint 39 — Customs Broker Execution */
    async startReview(req, res) {
        const body = StartBrokerReviewSchema.parse(req.body ?? {});
        res.json(await broker.startReview(user(req), req.params.id, body));
    },
    async verifyClassification(req, res) {
        const body = VerifyClassificationSchema.parse(req.body ?? {});
        res.json(await broker.verifyClassification(user(req), req.params.id, body));
    },
    async requestDocument(req, res) {
        const body = RequestCustomsDocumentSchema.parse(req.body ?? {});
        res.json(await broker.requestDocument(user(req), req.params.id, body));
    },
    async requestInformation(req, res) {
        const body = RequestCustomsInformationSchema.parse(req.body ?? {});
        res.json(await broker.requestInformation(user(req), req.params.id, body));
    },
    async startDeclarationPreparation(req, res) {
        res.json(await broker.startDeclarationPreparation(user(req), req.params.id));
    },
    async startCustomsProcessing(req, res) {
        res.json(await broker.startCustomsProcessing(user(req), req.params.id));
    },
    async markClearancePending(req, res) {
        res.json(await broker.markClearancePending(user(req), req.params.id));
    },
    async markCleared(req, res) {
        res.json(await broker.markCleared(user(req), req.params.id));
    },
    async brokerHold(req, res) {
        const body = BrokerHoldSchema.parse(req.body ?? {});
        res.json(await broker.placeHold(user(req), req.params.id, body));
    },
};
//# sourceMappingURL=customs.controller.js.map