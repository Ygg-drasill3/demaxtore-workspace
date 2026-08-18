import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db.js";
import { TradeWorkspaceService } from "./trade.service.js";
import { DocumentCenterService } from "../document-center/document-center.service.js";
import { ExceptionHubService } from "../exception-hub/exception-hub.service.js";
const service = new TradeWorkspaceService(prisma);
const docCenter = new DocumentCenterService(prisma);
const exceptionHub = new ExceptionHubService(prisma);
export const tradeController = {
    getWorkspace: asyncHandler(async (req, res) => {
        const payload = await service.getWorkspace(req.user, req.params.id);
        res.json(payload);
    }),
    getDocuments: asyncHandler(async (req, res) => {
        res.json(await docCenter.getTradeDocuments(req.user, req.params.id));
    }),
    getExceptions: asyncHandler(async (req, res) => {
        res.json(await exceptionHub.getTradeExceptions(req.user, req.params.id));
    }),
};
//# sourceMappingURL=trade.controller.js.map