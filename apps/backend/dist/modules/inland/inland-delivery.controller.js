import { InlandCancelSchema, InlandConfirmSchema, InlandCostSchema, RequestInlandDeliverySchema, SchedulePickupSchema, } from "@dmx/contracts/inland-delivery";
import { prisma } from "../../db/prisma.js";
import { createInlandDeliveryService } from "./inland-delivery.service.js";
function user(req) {
    return req.user;
}
const svc = createInlandDeliveryService(prisma);
export const inlandDeliveryController = {
    async list(req, res) {
        const attention = req.query.attention === "true" || req.query.attention === "1";
        const status = typeof req.query.status === "string" ? req.query.status : undefined;
        res.json(await svc.list(user(req), { attention, status }));
    },
    async request(req, res) {
        const body = RequestInlandDeliverySchema.parse(req.body ?? {});
        const row = await svc.request(user(req), body);
        res.status(201).json(row);
    },
    async get(req, res) {
        res.json(await svc.get(user(req), req.params.id));
    },
    async byShipment(req, res) {
        res.json(await svc.getByShipment(user(req), req.params.shipmentWorkspaceId));
    },
    async syncTrucker(req, res) {
        res.json(await svc.syncTrucker(user(req), req.params.id));
    },
    async schedulePickup(req, res) {
        const body = SchedulePickupSchema.parse(req.body ?? {});
        res.json(await svc.schedulePickup(user(req), req.params.id, body));
    },
    async readyForPickup(req, res) {
        res.json(await svc.readyForPickup(user(req), req.params.id));
    },
    async confirmPickup(req, res) {
        const body = InlandConfirmSchema.parse(req.body ?? {});
        res.json(await svc.confirmPickup(user(req), req.params.id, body));
    },
    async gateOut(req, res) {
        const body = InlandConfirmSchema.parse(req.body ?? {});
        res.json(await svc.gateOut(user(req), req.params.id, body));
    },
    async inTransit(req, res) {
        const body = InlandConfirmSchema.parse(req.body ?? {});
        res.json(await svc.inTransit(user(req), req.params.id, body));
    },
    async markDelivered(req, res) {
        const body = InlandConfirmSchema.parse(req.body ?? {});
        res.json(await svc.markDelivered(user(req), req.params.id, body));
    },
    async linkPod(req, res) {
        const tradeDocumentId = String(req.body?.tradeDocumentId ?? "");
        res.json(await svc.linkPod(user(req), req.params.id, tradeDocumentId));
    },
    async recordCost(req, res) {
        const body = InlandCostSchema.parse(req.body ?? {});
        res.json(await svc.recordCost(user(req), req.params.id, body));
    },
    async cancel(req, res) {
        const body = InlandCancelSchema.parse(req.body ?? {});
        res.json(await svc.cancel(user(req), req.params.id, body));
    },
    async events(req, res) {
        res.json(await svc.events(user(req), req.params.id));
    },
};
//# sourceMappingURL=inland-delivery.controller.js.map