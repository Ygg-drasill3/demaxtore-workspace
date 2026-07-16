import type { Request, Response } from "express";
import type { CommWorkspaceType, CommunicationAction } from "@dmx/contracts/workspace-communication";
import { CommWorkspaceTypeParam } from "@dmx/contracts/workspace-communication.zod";
import { prisma } from "../../db.js";
import { CommunicationService } from "./communication.service.js";
import { streamStoredFileToResponse } from "../../lib/file-storage.js";

const service = new CommunicationService(prisma);

const ACTION_MAP: Record<string, CommunicationAction> = {
  "create-message": "create_message",
  "edit-message": "edit_message",
  "delete-message": "delete_message",
  "mark-read": "mark_read",
};

function parseType(req: Request): CommWorkspaceType {
  return CommWorkspaceTypeParam.parse(req.params.workspaceType.toUpperCase());
}

export const communicationController = {
  async get(req: Request, res: Response) {
    const workspaceType = parseType(req);
    const workspaceId = req.params.workspaceId;
    res.json(await service.getConversation(workspaceType, workspaceId, req.user!));
  },

  async search(req: Request, res: Response) {
    const workspaceType = parseType(req);
    const workspaceId = req.params.workspaceId;
    res.json(await service.searchMessages(workspaceType, workspaceId, req.user!, req.query));
  },

  async action(req: Request, res: Response) {
    const actionKey = ACTION_MAP[req.params.action];
    if (!actionKey) {
      res.status(400).json({ error: { code: "UNKNOWN_ACTION", message: "Unknown action" } });
      return;
    }
    const workspaceType = parseType(req);
    const body = (req.body ?? {}) as { payload?: Record<string, unknown> };
    res.json(
      await service.applyCommunicationAction(
        workspaceType,
        req.params.workspaceId,
        actionKey,
        req.user!,
        body.payload ?? {},
        { ip: req.ip, userAgent: req.headers["user-agent"] },
      ),
    );
  },

  async uploadAttachment(req: Request, res: Response) {
    if (!req.file) {
      res.status(400).json({ error: { code: "NO_FILE", message: "file required" } });
      return;
    }
    const workspaceType = parseType(req);
    res.json(
      await service.uploadAttachment(
        workspaceType,
        req.params.workspaceId,
        req.user!,
        {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          buffer: req.file.buffer,
        },
      ),
    );
  },

  async downloadAttachment(req: Request, res: Response) {
    const workspaceType = parseType(req);
    const file = await service.getAttachmentForDownload(
      workspaceType,
      req.params.workspaceId,
      req.params.attachmentId,
      req.user!,
    );
    await streamStoredFileToResponse(file.storageKey, res, file);
  },
};
