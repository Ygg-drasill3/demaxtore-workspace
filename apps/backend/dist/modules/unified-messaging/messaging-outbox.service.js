import { logger } from "../../config/logger.js";
import { UnifiedMessagingWriteOrchestrator } from "./unified-messaging-write.orchestrator.js";
import { getMessagingWriteBridge } from "./messaging-write.bridge.js";
const MAX_ATTEMPTS = 8;
export class MessagingOutboxService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async enqueue(input, tx) {
        const db = tx ?? this.prisma;
        try {
            return await db.messagingOutboxEvent.create({
                data: {
                    eventType: input.eventType,
                    aggregateType: input.aggregateType,
                    aggregateId: input.aggregateId,
                    conversationId: input.conversationId,
                    messageId: input.messageId,
                    idempotencyKey: input.idempotencyKey,
                    payload: input.payload,
                    availableAt: input.availableAt ?? new Date(),
                    status: "PENDING",
                },
            });
        }
        catch (e) {
            const code = e && typeof e === "object" && "code" in e ? String(e.code) : "";
            if (code === "P2002")
                return null;
            throw e;
        }
    }
    async processBatch(limit = 25) {
        const now = new Date();
        const pending = await this.prisma.messagingOutboxEvent.findMany({
            where: {
                status: "PENDING",
                availableAt: { lte: now },
                attempts: { lt: MAX_ATTEMPTS },
            },
            orderBy: { availableAt: "asc" },
            take: limit,
        });
        let processed = 0;
        for (const row of pending) {
            const ok = await this.processOne(row.id);
            if (ok)
                processed += 1;
        }
        return processed;
    }
    async processOne(id) {
        const row = await this.prisma.messagingOutboxEvent.findUnique({ where: { id } });
        if (!row || row.status !== "PENDING")
            return false;
        await this.prisma.messagingOutboxEvent.update({
            where: { id },
            data: { attempts: { increment: 1 } },
        });
        try {
            await this.dispatch(row);
            await this.prisma.messagingOutboxEvent.update({
                where: { id },
                data: { status: "PROCESSED", processedAt: new Date(), lastErrorCode: null },
            });
            return true;
        }
        catch (err) {
            const attempts = row.attempts + 1;
            const backoffMs = Math.min(60_000, 1000 * 2 ** attempts);
            const isDead = attempts >= MAX_ATTEMPTS;
            await this.prisma.messagingOutboxEvent.update({
                where: { id },
                data: {
                    status: isDead ? "DEAD" : "PENDING",
                    failedAt: isDead ? new Date() : null,
                    lastErrorCode: "PROCESS_FAILED",
                    availableAt: isDead ? row.availableAt : new Date(Date.now() + backoffMs),
                },
            });
            logger.warn({ outboxId: id, attempts, err: String(err) }, "messaging outbox process failed");
            return false;
        }
    }
    async dispatch(row) {
        const payload = (row.payload ?? {});
        const bridge = getMessagingWriteBridge(this.prisma);
        const orchestrator = new UnifiedMessagingWriteOrchestrator(this.prisma);
        if (row.eventType === "LEGACY_MIRROR") {
            const actor = payload.actor;
            const mirrorInput = payload.mirrorInput;
            const legacy = payload.legacy;
            await orchestrator.mirrorFromLegacy(actor, mirrorInput, legacy);
            return;
        }
        if (row.eventType === "SOCKET_EMIT") {
            const event = payload.event;
            const eventPayload = payload.eventPayload;
            bridge.publishEvent(event, eventPayload);
            return;
        }
        if (row.eventType === "NOTIFICATION_DISPATCH") {
            const { notifyCommEvent } = await import("../workspace-communication/communication.notifications.js");
            await this.prisma.$transaction(async (tx) => {
                await notifyCommEvent(tx, payload.notifyInput);
            });
        }
    }
}
let outbox = null;
export function getMessagingOutboxService(prisma) {
    if (!outbox)
        outbox = new MessagingOutboxService(prisma);
    return outbox;
}
export function startMessagingOutboxWorker(prisma, intervalMs = 15_000) {
    const svc = getMessagingOutboxService(prisma);
    const tick = () => {
        void svc.processBatch().catch((err) => {
            logger.warn({ err: String(err) }, "messaging outbox worker tick failed");
        });
    };
    tick();
    const handle = setInterval(tick, intervalMs);
    handle.unref();
    logger.info({ intervalMs }, "✓ Messaging outbox worker started");
    return handle;
}
//# sourceMappingURL=messaging-outbox.service.js.map