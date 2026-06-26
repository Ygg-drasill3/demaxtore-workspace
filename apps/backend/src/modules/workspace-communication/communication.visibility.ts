import type { MessageVisibility } from "@dmx/contracts/workspace-communication";
import type { AuthUser } from "./communication.policy.js";

export interface VisibilityContext {
  buyerUserIds: string[];
  supplierUserIds: string[];
  participantUserIds: string[];
}

/** Server-side visibility filter — never trust the client. */
export function canViewMessage(
  user: AuthUser,
  visibility: MessageVisibility,
  ctx: VisibilityContext,
): boolean {
  if (user.role === "ADMIN") return true;

  const isBuyer = ctx.buyerUserIds.includes(user.id);
  const isSupplier = ctx.supplierUserIds.includes(user.id);
  const isParticipant = ctx.participantUserIds.includes(user.id);

  switch (visibility) {
    case "ALL_PARTICIPANTS":
      return isParticipant;
    case "BUYER_ONLY":
      return isBuyer;
    case "SUPPLIER_ONLY":
      return isSupplier;
    case "ADMIN_ONLY":
      return false;
    case "BUYER_ADMIN":
      return isBuyer;
    case "SUPPLIER_ADMIN":
      return isSupplier;
    default:
      return false;
  }
}

export function assertCanCreateVisibility(
  user: AuthUser,
  visibility: MessageVisibility,
  messageType: string,
): void {
  if (messageType === "INTERNAL_NOTE" && user.role !== "ADMIN") {
    throw new Error("INTERNAL_NOTE_ADMIN_ONLY");
  }
  if (visibility === "ADMIN_ONLY" && user.role !== "ADMIN") {
    throw new Error("ADMIN_VISIBILITY_ONLY");
  }
}

export function visibilityOptionsForRole(role: AuthUser["role"]): MessageVisibility[] {
  if (role === "ADMIN") {
    return [
      "ALL_PARTICIPANTS",
      "BUYER_ONLY",
      "SUPPLIER_ONLY",
      "ADMIN_ONLY",
      "BUYER_ADMIN",
      "SUPPLIER_ADMIN",
    ];
  }
  if (role === "BUYER") {
    return ["ALL_PARTICIPANTS", "BUYER_ONLY", "BUYER_ADMIN"];
  }
  return ["ALL_PARTICIPANTS", "SUPPLIER_ONLY", "SUPPLIER_ADMIN"];
}
