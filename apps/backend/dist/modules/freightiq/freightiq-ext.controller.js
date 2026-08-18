import { z } from "zod";
import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import { FreightIqService } from "./freightiq.service.js";
import { FreightCommunicationsService } from "./freight-communications.service.js";
import { ForwarderDirectoryService } from "./forwarder-directory.service.js";
import { ShipperDirectoryService } from "./shipper-directory.service.js";
import { CreateFreightShipperPayload } from "@dmx/contracts/freight-shippers.zod";
import { canAccessFreightForOrder } from "./freightiq.policy.js";
import { CreateForwarderPayload, UpdateForwarderPayload, } from "@dmx/contracts/freight-communications.zod";
const freightIq = new FreightIqService(prisma);
const comms = new FreightCommunicationsService(prisma);
const forwarders = new ForwarderDirectoryService(prisma);
const shippers = new ShipperDirectoryService(prisma);
const ActionBody = z.object({
    payload: z.record(z.unknown()).optional(),
});
const COMM_ACTION_MAP = {
    "send-communications": "send",
    "intake-offer": "intake",
    "mark-communication-responded": "responded",
};
export const freightiqExtController = {
    async myPortfolio(req, res) {
        res.json(await freightIq.getMyPortfolio(req.user));
    },
    async enrichedSummary(req, res) {
        const orderId = req.params.orderId;
        if (!(await canAccessFreightForOrder(prisma, req.user, orderId))) {
            throw new AppError(403, "FORBIDDEN");
        }
        const base = await freightIq.getSummary(orderId);
        res.json(await comms.enrichSummary(orderId, base, req.user));
    },
    async communicationAction(req, res) {
        const orderId = req.params.orderId;
        const kind = COMM_ACTION_MAP[req.params.action];
        if (!kind)
            throw new AppError(400, "UNKNOWN_ACTION");
        const body = ActionBody.parse(req.body ?? {});
        const payload = body.payload ?? {};
        const ctx = { ip: req.ip, userAgent: req.headers["user-agent"] };
        let result;
        if (kind === "send") {
            result = await comms.sendCommunications(orderId, req.user, payload, ctx);
        }
        else if (kind === "intake") {
            result = await comms.intakeOffer(orderId, req.user, payload, ctx);
        }
        else {
            result = await comms.markCommunicationResponded(orderId, req.user, payload, ctx);
        }
        res.json(result);
    },
    async emailTemplate(req, res) {
        const orderId = req.params.orderId;
        if (!(await canAccessFreightForOrder(prisma, req.user, orderId))) {
            throw new AppError(403, "FORBIDDEN");
        }
        const requestedReplyDate = req.query.requestedReplyDate ||
            new Date(Date.now() + 7 * 86400_000).toISOString();
        const incoterm = req.query.incoterm;
        res.json(await comms.previewTemplate(orderId, requestedReplyDate, incoterm));
    },
    async enrichedOpsOverview(_req, res) {
        const base = await freightIq.getOpsOverview();
        res.json(await comms.enrichOpsOverview(base));
    },
    async listForwarders(req, res) {
        const q = req.query.q;
        res.json(await forwarders.list(q));
    },
    async createForwarder(req, res) {
        const body = CreateForwarderPayload.parse(req.body);
        res.status(201).json(await forwarders.create(body));
    },
    async updateForwarder(req, res) {
        const body = UpdateForwarderPayload.parse(req.body);
        res.json(await forwarders.update(req.params.id, body));
    },
    async deactivateForwarder(req, res) {
        res.json(await forwarders.deactivate(req.params.id));
    },
    async listShippers(req, res) {
        const q = req.query.q;
        res.json(await shippers.list(q));
    },
    async createShipper(req, res) {
        const body = CreateFreightShipperPayload.parse(req.body);
        res.status(201).json(await shippers.create(body));
    },
    async deleteShipper(req, res) {
        await shippers.remove(req.params.id);
        res.status(204).send();
    },
};
//# sourceMappingURL=freightiq-ext.controller.js.map