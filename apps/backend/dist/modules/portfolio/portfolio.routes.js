import { Router } from "express";
import { ListPortfolioQuery } from "@dmx/contracts/portfolio.zod";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { PortfolioService } from "./portfolio.service.js";
import { getLegacyMessagingAdapters, shouldUseAdapterLayer, toMessagingActor, } from "../unified-messaging/adapters/legacy/index.js";
const service = new PortfolioService(prisma);
const adapters = () => getLegacyMessagingAdapters(prisma);
export const portfolioRouter = Router();
portfolioRouter.use(requireAuth);
portfolioRouter.get("/purchase-orders", asyncHandler(async (req, res) => {
    const q = ListPortfolioQuery.parse(req.query);
    res.json(await service.listPurchaseOrders(req.user, q));
}));
portfolioRouter.get("/shipments", asyncHandler(async (req, res) => {
    const q = ListPortfolioQuery.parse(req.query);
    res.json(await service.listShipments(req.user, q));
}));
portfolioRouter.get("/trade-documents", asyncHandler(async (req, res) => {
    const q = ListPortfolioQuery.parse(req.query);
    res.json(await service.listTradeDocuments(req.user, q));
}));
portfolioRouter.get("/messages", asyncHandler(async (req, res) => {
    const q = ListPortfolioQuery.parse(req.query);
    const actor = req.user;
    if (!shouldUseAdapterLayer()) {
        res.json(await service.listMessages(actor, q));
        return;
    }
    res.json(await adapters().portfolioMessages.listMessages(() => service.listMessages(actor, q), toMessagingActor(actor)));
}));
//# sourceMappingURL=portfolio.routes.js.map