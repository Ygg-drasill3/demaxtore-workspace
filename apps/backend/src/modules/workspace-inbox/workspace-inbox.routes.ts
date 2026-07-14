import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { WorkspaceInboxService } from "./workspace-inbox.service.js";
import { WorkspaceInboxQuerySchema } from "@dmx/contracts/workspace-inbox.zod";

const service = () => new WorkspaceInboxService(prisma);

export const workspaceInboxRouter = Router();

workspaceInboxRouter.use(requireAuth);

workspaceInboxRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = WorkspaceInboxQuerySchema.parse(req.query);
    res.json(await service().getInbox(req.user!, query));
  }),
);
