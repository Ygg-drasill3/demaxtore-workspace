import type { Request, Response } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db.js";
import {
  ExceptionAssignPayload,
  ExceptionClosePayload,
  ExceptionHubQuery,
  ExceptionResolvePayload,
} from "@dmx/contracts/exception-hub";
import { ExceptionHubService } from "./exception-hub.service.js";

const service = new ExceptionHubService(prisma);

export const exceptionHubController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = ExceptionHubQuery.parse(req.query);
    res.json(await service.list(req.user!, query));
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    res.json(await service.getDetail(req.user!, req.params.id));
  }),

  assign: asyncHandler(async (req: Request, res: Response) => {
    const body = ExceptionAssignPayload.parse(req.body);
    res.json(await service.assign(req.user!, req.params.id, body.ownerId, body.ownerRole));
  }),

  resolve: asyncHandler(async (req: Request, res: Response) => {
    const body = ExceptionResolvePayload.parse(req.body);
    res.json(await service.resolve(req.user!, req.params.id, body.resolutionNote, body.resolutionEta));
  }),

  close: asyncHandler(async (req: Request, res: Response) => {
    const body = ExceptionClosePayload.parse(req.body);
    res.json(await service.close(req.user!, req.params.id, body.note));
  }),

  tradeExceptions: asyncHandler(async (req: Request, res: Response) => {
    res.json(await service.getTradeExceptions(req.user!, req.params.id));
  }),

  shipmentExceptions: asyncHandler(async (req: Request, res: Response) => {
    res.json(await service.getShipmentExceptions(req.user!, req.params.id));
  }),
};
