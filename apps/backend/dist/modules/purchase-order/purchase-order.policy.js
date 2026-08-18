import { canonicalizePurchaseOrderStatus, canTransitionPoStatus, PO_ACKNOWLEDGE_ALLOWED_FROM, PO_AMENDMENT_ALLOWED_FROM, PO_APPROVE_ALLOWED_FROM, PO_CANCEL_ALLOWED_FROM, PO_CLOSE_ALLOWED_FROM, PO_COMPLETE_ALLOWED_FROM, PO_DRAFT_EDIT_ALLOWED_FROM, PO_START_EXECUTION_ALLOWED_FROM, PO_SUBMIT_ALLOWED_FROM, } from "@dmx/contracts/purchase-order.fsm";
import { AppError } from "../../utils/httpErrors.js";
import { canAccessOrder } from "../order/order.policy.js";
import { isPlatformAdminRole } from "../../lib/staff-roles.js";
export function resolvePoCapabilityRole(role) {
    const r = String(role);
    if (r === "SUPER_ADMIN")
        return "SUPER_ADMIN";
    if (r === "ADMIN")
        return "ADMIN";
    if (r === "OPS_MANAGER" || r === "DOCUMENT_CONTROLLER" || r === "SALES_CONTROL")
        return "MANAGER";
    if (r === "LOGISTICS_OPERATOR" || r === "FINANCE_OPERATOR")
        return "OPERATIONS";
    if (r === "BUYER" || r === "SUPPLIER")
        return "VIEWER"; // party roles use separate action checks
    return "VIEWER";
}
export async function canAccessPo(prisma, user, poId) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId }, select: { orderId: true } });
    if (!po)
        return false;
    if (isPlatformAdminRole(user.role) || user.role === "OPS_MANAGER")
        return true;
    return canAccessOrder(prisma, user, po.orderId);
}
const ACTION_ROLES = {
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
export function assertPoActionRole(action, role) {
    // SUPER_ADMIN inherits all PO capabilities (PRR-01).
    if (role === "SUPER_ADMIN")
        return;
    const allowed = ACTION_ROLES[action] ?? [];
    if (!allowed.includes(role))
        throw new Error("FORBIDDEN_ROLE");
}
export function assertPoTransition(fromStatus, toStatus, action) {
    const from = canonicalizePurchaseOrderStatus(fromStatus);
    if (!canTransitionPoStatus(from, toStatus)) {
        throw new AppError(409, "INVALID_PO_STATE", {
            message: `Cannot ${action}: ${from} → ${toStatus}`,
            from,
            to: toStatus,
        });
    }
}
export function assertCloseAllowed(status) {
    const s = canonicalizePurchaseOrderStatus(status);
    if (!PO_CLOSE_ALLOWED_FROM.includes(s)) {
        throw new AppError(409, "INVALID_PO_STATE", {
            message: `close_po only allowed from COMPLETED (current: ${s})`,
            from: s,
            to: "CLOSED",
        });
    }
}
export function assertCancelAllowed(status) {
    const s = canonicalizePurchaseOrderStatus(status);
    if (!PO_CANCEL_ALLOWED_FROM.includes(s)) {
        throw new AppError(409, "INVALID_PO_STATE", {
            message: `cancel_po not allowed from ${s}`,
            from: s,
            to: "CANCELLED",
        });
    }
}
export function assertAcknowledgeAllowed(status) {
    const s = canonicalizePurchaseOrderStatus(status);
    if (!PO_ACKNOWLEDGE_ALLOWED_FROM.includes(s)) {
        throw new AppError(409, "INVALID_PO_STATE", { from: s, to: "APPROVED" });
    }
}
export function assertAmendmentAllowed(status) {
    const s = canonicalizePurchaseOrderStatus(status);
    if (!PO_AMENDMENT_ALLOWED_FROM.includes(s)) {
        throw new AppError(409, "INVALID_PO_STATE", { from: s });
    }
}
export function assertSubmitAllowed(status) {
    const s = canonicalizePurchaseOrderStatus(status);
    if (!PO_SUBMIT_ALLOWED_FROM.includes(s)) {
        throw new AppError(409, "INVALID_PO_STATE", { from: s, to: "SUBMITTED" });
    }
}
export function assertApproveAllowed(status) {
    const s = canonicalizePurchaseOrderStatus(status);
    if (!PO_APPROVE_ALLOWED_FROM.includes(s)) {
        throw new AppError(409, "INVALID_PO_STATE", { from: s, to: "APPROVED" });
    }
}
export function assertStartExecutionAllowed(status) {
    const s = canonicalizePurchaseOrderStatus(status);
    if (!PO_START_EXECUTION_ALLOWED_FROM.includes(s)) {
        throw new AppError(409, "INVALID_PO_STATE", { from: s, to: "IN_EXECUTION" });
    }
}
export function assertCompleteAllowed(status) {
    const s = canonicalizePurchaseOrderStatus(status);
    if (!PO_COMPLETE_ALLOWED_FROM.includes(s)) {
        throw new AppError(409, "INVALID_PO_STATE", { from: s, to: "COMPLETED" });
    }
}
export function assertDraftEditAllowed(status) {
    const s = canonicalizePurchaseOrderStatus(status);
    if (!PO_DRAFT_EDIT_ALLOWED_FROM.includes(s)) {
        throw new AppError(409, "INVALID_PO_STATE", {
            message: "Only DRAFT purchase orders can be edited/deleted",
            from: s,
        });
    }
}
export function assertVersionMatch(current, expected) {
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
const DIRECT_PO_CREATOR_ROLES = ["BUYER", "ADMIN", "SUPER_ADMIN"];
export function assertCanCreateDirectPo(user) {
    if (user.role === "SUPPLIER") {
        throw new AppError(403, "DIRECT_PURCHASE_ORDER_FORBIDDEN");
    }
    if (!DIRECT_PO_CREATOR_ROLES.includes(user.role) && user.role !== "SUPER_ADMIN") {
        throw new AppError(403, "DIRECT_PURCHASE_ORDER_FORBIDDEN");
    }
}
export function assertCanCreateMinimalSupplier(user) {
    assertCanCreateDirectPo(user);
}
//# sourceMappingURL=purchase-order.policy.js.map