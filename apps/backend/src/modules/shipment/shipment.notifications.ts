import type { Prisma } from "@prisma/client";
import type { ShipmentTransition } from "@dmx/contracts/shipment.fsm";
import type { ActorRole } from "@dmx/contracts/rfq.fsm";
import type { FsmNotificationType as NotificationType } from "@dmx/contracts";

export interface ResolvedRecipient {
  userId?: string;
  broadcastRole?: "BUYER" | "SUPPLIER" | "ADMIN";
  notificationType: NotificationType;
  title: string;
  message: string;
}

interface WorkspaceFullForNotify {
  id: string;
  externalRef: string;
  createdById: string;
  participants: Array<{ userId: string; participantRole: string }>;
}

export async function resolveRecipients(
  _tx: Prisma.TransactionClient,
  transition: ShipmentTransition,
  workspace: WorkspaceFullForNotify,
  actor: { id: string; role: ActorRole },
): Promise<ResolvedRecipient[]> {
  const out: ResolvedRecipient[] = [];
  const ref = workspace.externalRef;
  const owner = workspace.createdById;
  const counterparties = workspace.participants
    .filter((p) => p.participantRole === "COUNTERPARTY")
    .map((p) => p.userId);
  const all = Array.from(new Set(workspace.participants.map((p) => p.userId)));

  for (const spec of transition.notifyRecipients) {
    const meta = { title: `Shipment · ${ref}`, message: `Shipment ${ref} — ${transition.auditEvent}` };
    if (spec.broadcast) {
      out.push({ broadcastRole: spec.broadcast.role as ResolvedRecipient["broadcastRole"], notificationType: spec.type, ...meta });
      continue;
    }
    if (spec.target === "OWNER" && owner !== actor.id) out.push({ userId: owner, notificationType: spec.type, ...meta });
    if (spec.target === "COUNTERPARTY") {
      for (const uid of counterparties) {
        if (uid !== actor.id) out.push({ userId: uid, notificationType: spec.type, ...meta });
      }
    }
    if (spec.target === "ALL_PARTICIPANTS") {
      for (const uid of all) {
        if (uid !== actor.id) out.push({ userId: uid, notificationType: spec.type, ...meta });
      }
    }
  }
  return out;
}
