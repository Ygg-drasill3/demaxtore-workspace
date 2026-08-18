import { z } from "zod";
import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import { TradeDocumentsService } from "./documents.service.js";
import { canAccessTradeWorkspace } from "./documents.policy.js";
const service = new TradeDocumentsService(prisma);
const ActionBody = z.object({
    payload: z.record(z.unknown()).optional(),
});
const ACTION_MAP = {
    "request-document": "request_document",
    "upload-document": "upload_document",
    "review-document": "review_document",
    "approve-document": "approve_document",
    "reject-document": "reject_document",
    "expire-document": "expire_document",
};
function parseWorkspaceType(raw) {
    if (raw === "ORDER" || raw === "SHIPMENT")
        return raw;
    throw new AppError(400, "INVALID_WORKSPACE_TYPE");
}
export const documentsController = {
    async summary(req, res) {
        const workspaceType = parseWorkspaceType(req.params.workspaceType);
        const workspaceId = req.params.workspaceId;
        const allowed = await canAccessTradeWorkspace(prisma, req.user, workspaceType, workspaceId);
        if (!allowed)
            throw new AppError(403, "FORBIDDEN");
        res.json(await service.getSummary(workspaceType, workspaceId));
    },
    async action(req, res) {
        const workspaceType = parseWorkspaceType(req.params.workspaceType);
        const workspaceId = req.params.workspaceId;
        const actionKey = ACTION_MAP[req.params.action];
        if (!actionKey)
            throw new AppError(400, "UNKNOWN_ACTION");
        const body = ActionBody.parse(req.body ?? {});
        res.json(await service.applyDocumentAction(workspaceType, workspaceId, actionKey, req.user, body.payload ?? {}, { ip: req.ip, userAgent: req.headers["user-agent"] }));
    },
};
//# sourceMappingURL=documents.controller.js.map