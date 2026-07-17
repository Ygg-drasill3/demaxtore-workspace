import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { ConversationHubService } from "./conversation-hub.service.js";
import {
  ConversationSearchQuerySchema,
  CreateTimelineItemSchema,
  MarkTimelineDeliveredSchema,
  MarkTimelineReadSchema,
  PinTimelineItemSchema,
} from "@dmx/contracts/conversation-hub.zod";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import { CommunicationService } from "../workspace-communication/communication.service.js";
import { streamStoredFileToResponse } from "../../lib/file-storage.js";
import {
  getLegacyMessagingAdapters,
  shouldUseAdapterLayer,
  toMessagingActor,
} from "../unified-messaging/adapters/legacy/index.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const hub = () => new ConversationHubService(prisma);
const comm = () => new CommunicationService(prisma);
const adapters = () => getLegacyMessagingAdapters(prisma);

export const conversationHubRouter = Router({ mergeParams: true });

conversationHubRouter.use(requireAuth);

conversationHubRouter.get("/", asyncHandler(async (req, res) => {
  const workspaceType = req.params.workspaceType!.toUpperCase() as CommWorkspaceType;
  const workspaceId = req.params.workspaceId!;
  const actor = req.user!;
  if (!shouldUseAdapterLayer()) {
    res.json(await hub().getHub(workspaceType, workspaceId, actor));
    return;
  }
  res.json(
    await adapters().conversationHub.getHub(
      () => hub().getHub(workspaceType, workspaceId, actor),
      workspaceType,
      workspaceId,
      toMessagingActor(actor),
    ),
  );
}));

conversationHubRouter.get("/search", asyncHandler(async (req, res) => {
  const workspaceType = req.params.workspaceType!.toUpperCase() as CommWorkspaceType;
  const workspaceId = req.params.workspaceId!;
  const query = ConversationSearchQuerySchema.parse(req.query);
  const actor = req.user!;
  if (!shouldUseAdapterLayer()) {
    res.json(await hub().search(workspaceType, workspaceId, actor, query));
    return;
  }
  res.json(
    await adapters().conversationHub.search(
      () => hub().search(workspaceType, workspaceId, actor, query),
      workspaceType,
      workspaceId,
      toMessagingActor(actor),
    ),
  );
}));

conversationHubRouter.get("/participants", asyncHandler(async (req, res) => {
  const workspaceType = req.params.workspaceType!.toUpperCase() as CommWorkspaceType;
  const workspaceId = req.params.workspaceId!;
  const actor = req.user!;
  if (!shouldUseAdapterLayer()) {
    const data = await hub().getHub(workspaceType, workspaceId, actor);
    res.json(data.participants);
    return;
  }
  const data = await adapters().conversationHub.getHub(
    () => hub().getHub(workspaceType, workspaceId, actor),
    workspaceType,
    workspaceId,
    toMessagingActor(actor),
  ) as Awaited<ReturnType<ConversationHubService["getHub"]>>;
  res.json(data.participants);
}));

conversationHubRouter.post("/timeline", asyncHandler(async (req, res) => {
  const workspaceType = req.params.workspaceType!.toUpperCase() as CommWorkspaceType;
  const workspaceId = req.params.workspaceId!;
  const body = CreateTimelineItemSchema.parse(req.body);
  res.status(201).json(await hub().createTimelineItem(workspaceType, workspaceId, req.user!, body));
}));

conversationHubRouter.post("/timeline/delivered", asyncHandler(async (req, res) => {
  const workspaceType = req.params.workspaceType!.toUpperCase() as CommWorkspaceType;
  const workspaceId = req.params.workspaceId!;
  const { messageId } = MarkTimelineDeliveredSchema.parse(req.body);
  res.json(await hub().markDelivered(workspaceType, workspaceId, req.user!, messageId));
}));

conversationHubRouter.post("/timeline/read", asyncHandler(async (req, res) => {
  const workspaceType = req.params.workspaceType!.toUpperCase() as CommWorkspaceType;
  const workspaceId = req.params.workspaceId!;
  const { messageId } = MarkTimelineReadSchema.parse(req.body);
  res.json(await hub().markRead(workspaceType, workspaceId, req.user!, messageId));
}));

conversationHubRouter.post("/timeline/:messageId/pin", asyncHandler(async (req, res) => {
  const workspaceType = req.params.workspaceType!.toUpperCase() as CommWorkspaceType;
  const workspaceId = req.params.workspaceId!;
  const messageId = req.params.messageId!;
  const { pinned } = PinTimelineItemSchema.parse(req.body);
  res.json(await hub().setPinned(workspaceType, workspaceId, req.user!, messageId, pinned));
}));

conversationHubRouter.post(
  "/attachments",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ code: "FILE_REQUIRED" });
      return;
    }
    const workspaceType = req.params.workspaceType!.toUpperCase() as CommWorkspaceType;
    const workspaceId = req.params.workspaceId!;
    const result = await comm().uploadAttachment(workspaceType, workspaceId, req.user!, {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      buffer: req.file.buffer,
    });
    res.status(201).json(result);
  }),
);

conversationHubRouter.get(
  "/attachments/:attachmentId/download",
  asyncHandler(async (req, res) => {
    const workspaceType = req.params.workspaceType!.toUpperCase() as CommWorkspaceType;
    const workspaceId = req.params.workspaceId!;
    const file = await comm().getAttachmentForDownload(
      workspaceType,
      workspaceId,
      req.params.attachmentId!,
      req.user!,
    );
    await streamStoredFileToResponse(file.storageKey, res, file);
  }),
);
