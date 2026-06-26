import type { Prisma } from "@prisma/client";
import type { CommodityBidTransition, ActorRole, NotificationType } from "@dmx/contracts/commoditybid.fsm";

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
  commodityBidDetails?: { title: string; lowestBidSupplierId?: string | null } | null;
  commodityBidAwards?: Array<{ supplierUserId: string; status: string }>;
}

export async function resolveRecipients(
  _tx: Prisma.TransactionClient,
  transition: CommodityBidTransition,
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
    const meta = { title: titleFor(spec.titleKey, ref), message: messageFor(spec.titleKey, ref) };
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
    if (spec.target === "SELECTED_SUPPLIER") {
      const winnerId =
        workspace.commodityBidDetails?.lowestBidSupplierId ??
        workspace.commodityBidAwards?.find((a) => a.status === "WINNER" || a.status === "ACCEPTED")?.supplierUserId;
      if (winnerId && winnerId !== actor.id) {
        out.push({ userId: winnerId, notificationType: spec.type, ...meta });
      }
    }
  }
  return out;
}

function titleFor(key: string, ref: string): string {
  const map: Record<string, string> = {
    "bid.submitted.admin": `CommodityBid submitted · ${ref}`,
    "bid.published": `Bid opened · ${ref}`,
    "bid.evaluation.ready": `Bids closed · ${ref}`,
    "bid.awards.published": `Awards published · ${ref}`,
  };
  return map[key] ?? `CommodityBid update · ${ref}`;
}

function messageFor(key: string, ref: string): string {
  return titleFor(key, ref);
}
