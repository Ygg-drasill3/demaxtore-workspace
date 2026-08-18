import { z } from "zod";
import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import { FreightIqService } from "./freightiq.service.js";
const service = new FreightIqService(prisma);
const ActionBody = z.object({
    payload: z.record(z.unknown()).optional(),
});
const ACTION_MAP = {
    "create-request": "create_request",
    "submit-offer": "submit_offer",
    "revise-offer": "revise_offer",
    "withdraw-offer": "withdraw_offer",
    "select-offer": "select_offer",
    "cancel-request": "cancel_request",
    "proceed-to-booking": "proceed_to_booking",
};
export const freightiqController = {
    async action(req, res) {
        const orderId = req.params.orderId;
        const actionKey = ACTION_MAP[req.params.action];
        if (!actionKey)
            throw new AppError(400, "UNKNOWN_ACTION");
        const body = ActionBody.parse(req.body ?? {});
        res.json(await service.applyFreightAction(orderId, actionKey, req.user, body.payload ?? {}, { ip: req.ip, userAgent: req.headers["user-agent"] }));
    },
    async operationsOverview(_req, res) {
        res.json(await service.getOpsOverview());
    },
};
//# sourceMappingURL=freightiq.controller.js.map