import type { PrismaClient } from "@prisma/client";
import type { PoAction } from "@dmx/contracts/purchase-order";
import {
  canonicalizePurchaseOrderStatus,
  canTransitionPoStatus,
  PO_ACKNOWLEDGE_ALLOWED_FROM,
  PO_AMENDMENT_ALLOWED_FROM,
  PO_APPROVE_ALLOWED_FROM,
  PO_CANCEL_ALLOWED_FROM,
  PO_CLOSE_ALLOWED_FROM,
  PO_COMPLETE_ALLOWED_FROM,
  PO_DRAFT_EDIT_ALLOWED_FROM,
  PO_START_EXECUTION_ALLOWED_FROM,
  PO_SUBMIT_ALLOWED_FROM,
  type PurchaseOrderFsmState,
} from "@dmx/contracts/purchase-order.fsm";
import { AppError } from "../../utils/httpErrors.js";
import { canAccessOrder, type AuthUser } from "../order/order.policy.js";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";

export type { AuthUser };

/** PRR-01 capability roles mapped onto platform roles. */
export type PoCapabilityRole = "VIEWER" | "OPERATIONS" | "MANAGER" | "ADMIN" | "SUPER_ADMIN";

export function resolvePoCapabilityRole(role: AuthUser["role"] | string): PoCapabilityRole {
  const r = String(role);
  if (r === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (r === "ADMIN") return "ADMIN";
  if (r === "OPS_MANAGER" || r === "DOCUMENT_CONTROLLER" || r === "SALES_CONTROL") return "MANAGER";
  if (r === "LOGISTICS_OPERATOR" || r === "FINANCE_OPERATOR") return "OPERATIONS";
  if (r === "BUYER" || r === "SUPPLIER") return "VIEWER"; // party roles use separate action checks
  return "VIEWER";
}

export async function canAccessPo(
  prisma: PrismaClient,
  user: AuthUser,
  poId: string,
): Promise<boolean> {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { orderId: true } });
  if (!po) return false;
  if (isPlatformAdminRole(user.role) || user.role === "OPS_MANAGER") return true;
  return canAccessOrder(prisma, user, po.orderId);
}

const ACTION_ROLES: Record<PoAction, Array<AuthUser["role"] | "SUPER_ADMIN">> = {
  issue_po: ["BUYER", "ADMIN", "SUPER_ADMIN"],
  submit_po: ["BUYER", "ADMIN", "SUPER_ADMIN"],
  approve_po: ["BUYER", "ADMIN", "SUPER_ADMIN", "OPS_MANAGER"],
  start_execution: ["BUYER", "ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR"],
  complete_po: ["BUYER", "ADMIN", "SUPER_ADMIN", "OPS_MANAGER"],
  acknowledge_po: ["SUPPLIER", "ADMIN", "SUPER_ADMIN"],
  request_amendment: ["SUPPLIER", "BUYER", "ADMIN", "SUPER_ADMIN"],
  approve_amendment: ["BUYER", "ADMIN", "SUPER_ADMIN"],
  reject_amendment: ["BUYER", "ADMIN", "SUPER_ADMIN"],
  close_po: ["BUYER", "ADMIN", "SUPER_ADMIN", "OPS_MANAGER"],
  cancel_po: ["BUYER", "ADMIN", "SUPER_ADMIN", "OPS_MANAGER"],
};

export function assertPoActionRole(action: PoAction, role: AuthUser["role"]): void {
  // SUPER_ADMIN inherits all PO capabilities (PRR-01).
  if (role === "SUPER_ADMIN") return;
  const allowed = ACTION_ROLES[action] ?? [];
  if (!allowed.includes(role)) throw new Error("FORBIDDEN_ROLE");
}

export function assertPoTransition(
  fromStatus: string,
  toStatus: PurchaseOrderFsmState,
  action: string,
): void {
  const from = canonicalizePurchaseOrderStatus(fromStatus);
  if (!canTransitionPoStatus(from, toStatus)) {
    throw new AppError(409, "INVALID_PO_STATE", {
      message: `Cannot ${action}: ${from} → ${toStatus}`,
      from,
      to: toStatus,
    });
  }
}

export function assertCloseAllowed(status: string): void {
  const s = canonicalizePurchaseOrderStatus(status);
  if (!PO_CLOSE_ALLOWED_FROM.includes(s)) {
    throw new AppError(409, "INVALID_PO_STATE", {
      message: `close_po only allowed from COMPLETED (current: ${s})`,
      from: s,
      to: "CLOSED",
    });
  }
}

export function assertCancelAllowed(status: string): void {
  const s = canonicalizePurchaseOrderStatus(status);
  if (!PO_CANCEL_ALLOWED_FROM.includes(s)) {
    throw new AppError(409, "INVALID_PO_STATE", {
      message: `cancel_po not allowed from ${s}`,
      from: s,
      to: "CANCELLED",
    });
  }
}

export function assertAcknowledgeAllowed(status: string): void {
  const s = canonicalizePurchaseOrderStatus(status);
  if (!PO_ACKNOWLEDGE_ALLOWED_FROM.includes(s)) {
    throw new AppError(409, "INVALID_PO_STATE", { from: s, to: "APPROVED" });
  }
}

export function assertAmendmentAllowed(status: string): void {
  const s = canonicalizePurchaseOrderStatus(status);
  if (!PO_AMENDMENT_ALLOWED_FROM.includes(s)) {
    throw new AppError(409, "INVALID_PO_STATE", { from: s });
  }
}

export function assertSubmitAllowed(status: string): void {
  const s = canonicalizePurchaseOrderStatus(status);
  if (!PO_SUBMIT_ALLOWED_FROM.includes(s)) {
    throw new AppError(409, "INVALID_PO_STATE", { from: s, to: "SUBMITTED" });
  }
}

export function assertApproveAllowed(status: string): void {
  const s = canonicalizePurchaseOrderStatus(status);
  if (!PO_APPROVE_ALLOWED_FROM.includes(s)) {
    throw new AppError(409, "INVALID_PO_STATE", { from: s, to: "APPROVED" });
  }
}

export function assertStartExecutionAllowed(status: string): void {
  const s = canonicalizePurchaseOrderStatus(status);
  if (!PO_START_EXECUTION_ALLOWED_FROM.includes(s)) {
    throw new AppError(409, "INVALID_PO_STATE", { from: s, to: "IN_EXECUTION" });
  }
}

export function assertCompleteAllowed(status: string): void {
  const s = canonicalizePurchaseOrderStatus(status);
  if (!PO_COMPLETE_ALLOWED_FROM.includes(s)) {
    throw new AppError(409, "INVALID_PO_STATE", { from: s, to: "COMPLETED" });
  }
}

export function assertDraftEditAllowed(status: string): void {
  const s = canonicalizePurchaseOrderStatus(status);
  if (!PO_DRAFT_EDIT_ALLOWED_FROM.includes(s)) {
    throw new AppError(409, "INVALID_PO_STATE", {
      message: "Only DRAFT purchase orders can be edited/deleted",
      from: s,
    });
  }
}

export function assertVersionMatch(current: number, expected: number | undefined | null): void {
  if (expected == null) {
    throw new AppError(422, "VERSION_REQUIRED", {
      message: "Optimistic lock version is required",
      currentVersion: current,
    });
  }
  if (current !== expected) {
    throw new AppError(409, "PO_VERSION_CONFLICT", {
      message: "Purchase Order was updated by someone else. Reload and retry.",
      currentVersion: current,
      providedVersion: expected,
    });
  }
}

const DIRECT_PO_CREATOR_ROLES: AuthUser["role"][] = ["BUYER", "ADMIN", "SUPER_ADMIN"];

export function assertCanCreateDirectPo(user: AuthUser): void {
  if (user.role === "SUPPLIER") {
    throw new AppError(403, "DIRECT_PURCHASE_ORDER_FORBIDDEN");
  }
  if (!DIRECT_PO_CREATOR_ROLES.includes(user.role) && user.role !== "SUPER_ADMIN") {
    throw new AppError(403, "DIRECT_PURCHASE_ORDER_FORBIDDEN");
  }
}

export function assertCanCreateMinimalSupplier(user: AuthUser): void {
  assertCanCreateDirectPo(user);
}
