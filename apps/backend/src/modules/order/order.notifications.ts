import type { Prisma } from "@prisma/client";
import type { OrderTransition, ActorRole } from "@dmx/contracts/order.fsm";
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
  transition: OrderTransition,
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
    const meta = {
      title: titleFor(spec.titleKey, ref),
      message: messageFor(spec.titleKey, ref),
    };
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

function titleFor(key: string, ref: string): string {
  return TITLE_MAP[key]?.replace("{ref}", ref) ?? `Order update · ${ref}`;
}

function messageFor(key: string, ref: string): string {
  return MESSAGE_MAP[key]?.replace("{ref}", ref) ?? titleFor(key, ref);
}

const TITLE_MAP: Record<string, string> = {
  "order.spawned": "Order created — {ref}",
  "order.supplier_confirmed": "Supplier confirmed order — {ref}",
  "order.confirm_sla_expired": "Supplier confirmation overdue — {ref}",
  "order.production.started": "Production started — {ref}",
  "order.production.progress": "Production progress update — {ref}",
  "order.production.completed": "Production completed — {ref}",
  "order.inspection.requested": "Inspection requested — {ref}",
  "order.inspection.skipped": "Inspection skipped — {ref}",
  "order.inspection.completed": "Inspection completed — {ref}",
  "order.freight.requested": "Freight quote requested — {ref}",
  "order.dispute.opened": "Order dispute opened — {ref}",
  "order.shipment.booked": "Shipment booked — {ref}",
  "order.shipment.departed": "Shipment departed — {ref}",
  "order.shipment.eta_updated": "Shipment ETA updated — {ref}",
  "order.shipment.arrived": "Shipment arrived — {ref}",
  "order.delivered": "Order delivered — {ref}",
  "order.partially_delivered": "Partial delivery recorded — {ref}",
  "order.closed": "Order closed — {ref}",
  "order.cancelled": "Order cancelled — {ref}",
  "order.rejected": "Order rejected — {ref}",
  "order.dispute.resolved": "Dispute resolved — {ref}",
};

const MESSAGE_MAP: Record<string, string> = {
  ...TITLE_MAP,
  "order.production.progress": "Supplier reported production progress on {ref}.",
  "order.freight.requested": "A freight quote has been requested for {ref}. Review offers in the order workspace.",
};
