import { CreatePasswordlessLinkInput, ConsumePasswordlessAccessInput, } from "@dmx/contracts/passwordless-access";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import * as svc from "./passwordless-access.service.js";
function requestMeta(req) {
    const fwd = req.headers["x-forwarded-for"];
    const ip = typeof fwd === "string" ? fwd.split(",")[0]?.trim() : Array.isArray(fwd) ? fwd[0] : undefined;
    return {
        ip: ip ?? req.ip ?? req.socket.remoteAddress ?? undefined,
        userAgent: req.headers["user-agent"],
        secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    };
}
export const createLink = [
    requireAuth,
    validateBody(CreatePasswordlessLinkInput),
    asyncHandler(async (req, res) => {
        const body = req.body;
        const result = await svc.createPasswordlessLink(req.user, body);
        res.status(201).json(result);
    }),
];
export const consume = [
    validateBody(ConsumePasswordlessAccessInput),
    asyncHandler(async (req, res) => {
        const body = req.body;
        const result = await svc.consumePasswordlessAccess(body.token, requestMeta(req));
        res.json(result);
    }),
];
//# sourceMappingURL=passwordless-access.controller.js.map