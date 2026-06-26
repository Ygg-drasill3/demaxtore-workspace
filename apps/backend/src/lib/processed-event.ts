import { Prisma, type PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

type Db = PrismaClient | Prisma.TransactionClient;

export interface ClaimProcessedEventInput {
  source: string;
  eventId: string;
  workspaceId?: string;
  action?: string;
  payload?: Record<string, unknown>;
}

/** Returns true when this event is new and should be processed; false when already seen. */
export async function claimProcessedEvent(db: Db, input: ClaimProcessedEventInput): Promise<boolean> {
  try {
    await db.processedEvent.create({
      data: {
        id: randomUUID(),
        source: input.source,
        eventId: input.eventId,
        workspaceId: input.workspaceId ?? null,
        action: input.action ?? null,
        payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return false;
    }
    throw e;
  }
}

export async function findProcessedEvent(db: Db, source: string, eventId: string) {
  return db.processedEvent.findUnique({
    where: { source_eventId: { source, eventId } },
  });
}

/**
 * Releases a previously-claimed event so that a failed/aborted processing
 * attempt can be retried. Without this, a claim committed before processing
 * permanently blocks the provider's retry (idempotency "brick" / event loss).
 */
export async function releaseProcessedEvent(db: Db, source: string, eventId: string): Promise<void> {
  await db.processedEvent.deleteMany({ where: { source, eventId } });
}
