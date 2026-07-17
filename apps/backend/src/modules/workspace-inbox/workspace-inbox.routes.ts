import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { WorkspaceInboxService } from "./workspace-inbox.service.js";
import { WorkspaceInboxQuerySchema } from "@dmx/contracts/workspace-inbox.zod";
import {
  getLegacyMessagingAdapters,
  shouldUseAdapterLayer,
  toMessagingActor,
} from "../unified-messaging/adapters/legacy/index.js";

const service = () => new WorkspaceInboxService(prisma);
const adapters = () => getLegacyMessagingAdapters(prisma);

export const workspaceInboxRouter = Router();

workspaceInboxRouter.use(requireAuth);

workspaceInboxRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = WorkspaceInboxQuerySchema.parse(req.query);
    const actor = req.user!;
    if (!shouldUseAdapterLayer()) {
      res.json(await service().getInbox(actor, query));
      return;
    }
    res.json(
      await adapters().workspaceInbox.getInbox(
        () => service().getInbox(actor, query),
        toMessagingActor(actor),
      ),
    );
  }),
);
