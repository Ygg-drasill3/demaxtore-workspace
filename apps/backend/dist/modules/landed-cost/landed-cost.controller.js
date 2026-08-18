import { LandedCostCalculateSchema, TransactionCostCreateSchema, } from "@dmx/contracts/landed-cost";
import { prisma } from "../../db/prisma.js";
import { createLandedCostService } from "./landed-cost.service.js";
function user(req) {
    return req.user;
}
const svc = createLandedCostService(prisma);
export const landedCostController = {
    async list(req, res) {
        res.json(await svc.list(user(req)));
    },
    async calculate(req, res) {
        const body = LandedCostCalculateSchema.parse(req.body ?? {});
        res.status(201).json(await svc.calculate(user(req), body));
    },
    async get(req, res) {
        res.json(await svc.get(user(req), req.params.id));
    },
    async byShipment(req, res) {
        res.json(await svc.currentByShipment(user(req), req.params.shipmentWorkspaceId));
    },
    async versions(req, res) {
        res.json(await svc.versions(user(req), req.params.shipmentWorkspaceId));
    },
    async addCost(req, res) {
        const body = TransactionCostCreateSchema.parse(req.body ?? {});
        const row = await svc.addTransactionCost(user(req), body);
        res.status(201).json(row);
    },
};
//# sourceMappingURL=landed-cost.controller.js.map