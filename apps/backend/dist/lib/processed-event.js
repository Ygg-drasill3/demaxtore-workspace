import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
/** Returns true when this event is new and should be processed; false when already seen. */
export async function claimProcessedEvent(db, input) {
    try {
        await db.processedEvent.create({
            data: {
                id: randomUUID(),
                source: input.source,
                eventId: input.eventId,
                workspaceId: input.workspaceId ?? null,
                action: input.action ?? null,
                payload: (input.payload ?? undefined),
            },
        });
        return true;
    }
    catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            return false;
        }
        throw e;
    }
}
export async function findProcessedEvent(db, source, eventId) {
    return db.processedEvent.findUnique({
        where: { source_eventId: { source, eventId } },
    });
}
/**
 * Releases a previously-claimed event so that a failed/aborted processing
 * attempt can be retried. Without this, a claim committed before processing
 * permanently blocks the provider's retry (idempotency "brick" / event loss).
 */
export async function releaseProcessedEvent(db, source, eventId) {
    await db.processedEvent.deleteMany({ where: { source, eventId } });
}
//# sourceMappingURL=processed-event.js.map