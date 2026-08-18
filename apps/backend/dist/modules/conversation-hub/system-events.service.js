import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { canAccessCommWorkspace, resolveWorkspace, } from "../workspace-communication/communication.policy.js";
import { bootstrapWorkspaceConversation } from "./conversation-bootstrap.js";
import { getMessagingWriteBridge } from "../unified-messaging/messaging-write.bridge.js";
export class SystemEventsService {
    db;
    constructor(db) {
        this.db = db;
    }
    async record(workspaceType, workspaceId, input) {
        const resolved = await resolveWorkspace(this.db, workspaceType, workspaceId);
        if (!resolved)
            return null;
        const existing = await this.db.workspaceMessage.findFirst({
            where: {
                conversation: {
                    workspaceType: resolved.workspaceType,
                    workspaceId: resolved.workspaceId,
                },
                systemEventKey: input.systemEventKey,
            },
            select: { id: true },
        });
        if (existing)
            return existing.id;
        const messageId = await this.db.$transaction(async (tx) => {
            await bootstrapWorkspaceConversation(tx, resolved.workspaceType, resolved.workspaceId);
            const conv = await tx.workspaceConversation.findUniqueOrThrow({
                where: {
                    workspaceType_workspaceId: {
                        workspaceType: resolved.workspaceType,
                        workspaceId: resolved.workspaceId,
                    },
                },
            });
            const msg = await tx.workspaceMessage.create({
                data: {
                    conversationId: conv.id,
                    authorUserId: input.actorUserId,
                    messageType: "SYSTEM_EVENT",
                    visibility: "ALL_PARTICIPANTS",
                    body: input.body,
                    channelSource: "WORKSPACE",
                    systemEventKey: input.systemEventKey,
                    metadata: {
                        systemEventType: input.systemEventType,
                        ...(input.metadata ?? {}),
                    },
                },
            });
            await this.seedDeliveries(tx, msg.id, resolved, input.actorUserId);
            return msg.id;
        });
        socketBus.scheduleEmit(() => {
            socketBus.emitToWorkspace(resolved.auditWorkspaceId, SocketEvents.COMMUNICATION_CREATED, {
                workspaceType: resolved.workspaceType,
                workspaceId: resolved.workspaceId,
                messageId,
            });
        });
        void getMessagingWriteBridge(this.db)
            .onSystemMessage({
            workspaceType: resolved.workspaceType,
            workspaceId: resolved.workspaceId,
            auditWorkspaceId: resolved.auditWorkspaceId,
            messageId,
            body: input.body,
        })
            .catch(() => undefined);
        void (async () => {
            // FSM transitions already create notifications; only bootstrap events need engine fan-out.
            if (String(input.systemEventType) !== "WORKSPACE_CREATED")
                return;
            try {
                const { emitSystemEventNotifications } = await import("../notification-engine/notification-engine.service.js");
                await emitSystemEventNotifications(this.db, {
                    auditWorkspaceId: resolved.auditWorkspaceId,
                    commWorkspaceType: resolved.workspaceType,
                    commWorkspaceId: resolved.workspaceId,
                    systemEventType: String(input.systemEventType),
                    title: "Workspace assigned",
                    message: input.body,
                    actorUserId: input.actorUserId,
                });
            }
            catch {
                // non-blocking awareness layer
            }
        })();
        return messageId;
    }
    async seedDeliveries(tx, messageId, resolved, authorId) {
        const parts = await tx.workspaceParticipant.findMany({
            where: { workspaceId: resolved.auditWorkspaceId, leftAt: null },
            select: { userId: true },
        });
        const now = new Date();
        for (const p of parts) {
            if (p.userId === authorId)
                continue;
            await tx.workspaceMessageDelivery.create({
                data: {
                    messageId,
                    userId: p.userId,
                    sentAt: now,
                },
            });
        }
    }
    async recordIfAllowed(actor, workspaceType, workspaceId, input) {
        if (actor) {
            const allowed = await canAccessCommWorkspace(this.db, actor, workspaceType, workspaceId);
            if (!allowed)
                return null;
        }
        return this.record(workspaceType, workspaceId, input);
    }
}
//# sourceMappingURL=system-events.service.js.map