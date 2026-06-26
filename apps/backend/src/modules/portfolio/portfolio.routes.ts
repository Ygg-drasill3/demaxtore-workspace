import { Router } from "express";
import { ListPortfolioQuery } from "@dmx/contracts/portfolio.zod";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { PortfolioService } from "./portfolio.service.js";

const service = new PortfolioService(prisma);

export const portfolioRouter = Router();

portfolioRouter.use(requireAuth);

portfolioRouter.get(
  "/purchase-orders",
  asyncHandler(async (req, res) => {
    const q = ListPortfolioQuery.parse(req.query);
    res.json(await service.listPurchaseOrders(req.user!, q));
  }),
);

portfolioRouter.get(
  "/shipments",
  asyncHandler(async (req, res) => {
    const q = ListPortfolioQuery.parse(req.query);
    res.json(await service.listShipments(req.user!, q));
  }),
);

portfolioRouter.get(
  "/trade-documents",
  asyncHandler(async (req, res) => {
    const q = ListPortfolioQuery.parse(req.query);
    res.json(await service.listTradeDocuments(req.user!, q));
  }),
);

portfolioRouter.get(
  "/messages",
  asyncHandler(async (req, res) => {
    const q = ListPortfolioQuery.parse(req.query);
    res.json(await service.listMessages(req.user!, q));
  }),
);
