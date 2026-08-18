import { CommWorkspaceTypeParam } from "@dmx/contracts/workspace-communication.zod";
import { prisma } from "../../db.js";
import { CommunicationService } from "./communication.service.js";
import { streamStoredFileToResponse } from "../../lib/file-storage.js";
import { getLegacyMessagingAdapters, shouldUseAdapterLayer, toMessagingActor, } from "../unified-messaging/adapters/legacy/index.js";
const service = new CommunicationService(prisma);
const adapters = () => getLegacyMessagingAdapters(prisma);
const ACTION_MAP = {
    "create-message": "create_message",
    "edit-message": "edit_message",
    "delete-message": "delete_message",
    "mark-read": "mark_read",
};
function parseType(req) {
    return CommWorkspaceTypeParam.parse(req.params.workspaceType.toUpperCase());
}
export const communicationController = {
    async get(req, res) {
        const workspaceType = parseType(req);
        const workspaceId = req.params.workspaceId;
        const actor = req.user;
        if (!shouldUseAdapterLayer()) {
            res.json(await service.getConversation(workspaceType, workspaceId, actor));
            return;
        }
        res.json(await adapters().workspaceCommunication.getConversation(() => service.getConversation(workspaceType, workspaceId, actor), workspaceType, workspaceId, toMessagingActor(actor)));
    },
    async search(req, res) {
        const workspaceType = parseType(req);
        const workspaceId = req.params.workspaceId;
        const actor = req.user;
        if (!shouldUseAdapterLayer()) {
            res.json(await service.searchMessages(workspaceType, workspaceId, actor, req.query));
            return;
        }
        res.json(await adapters().workspaceCommunication.searchMessages(() => service.searchMessages(workspaceType, workspaceId, actor, req.query), workspaceType, workspaceId, toMessagingActor(actor)));
    },
    async action(req, res) {
        const actionKey = ACTION_MAP[req.params.action];
        if (!actionKey) {
            res.status(400).json({ error: { code: "UNKNOWN_ACTION", message: "Unknown action" } });
            return;
        }
        const workspaceType = parseType(req);
        const body = (req.body ?? {});
        res.json(await service.applyCommunicationAction(workspaceType, req.params.workspaceId, actionKey, req.user, body.payload ?? {}, { ip: req.ip, userAgent: req.headers["user-agent"] }));
    },
    async uploadAttachment(req, res) {
        if (!req.file) {
            res.status(400).json({ error: { code: "NO_FILE", message: "file required" } });
            return;
        }
        const workspaceType = parseType(req);
        res.json(await service.uploadAttachment(workspaceType, req.params.workspaceId, req.user, {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            buffer: req.file.buffer,
        }));
    },
    async downloadAttachment(req, res) {
        const workspaceType = parseType(req);
        const file = await service.getAttachmentForDownload(workspaceType, req.params.workspaceId, req.params.attachmentId, req.user);
        await streamStoredFileToResponse(file.storageKey, res, file);
    },
};
//# sourceMappingURL=communication.controller.js.map