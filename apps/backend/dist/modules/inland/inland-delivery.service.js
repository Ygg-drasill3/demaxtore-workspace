import { INLAND_CUSTOMS_GATED_STATUSES, canTransitionInland, } from "@dmx/contracts/inland-delivery";
import { AppError } from "../../utils/httpErrors.js";
import { canAccessShipment } from "../shipment/shipment.policy.js";
import { createLandedCostService } from "../landed-cost/landed-cost.service.js";
import { OperationalIssueService } from "../operational-issue/operational-issue.service.js";
import { OperationalTaskService } from "../operational-task/operational-task.service.js";
function iso(d) {
    return d ? d.toISOString() : null;
}
function sourceFor(actor) {
    const r = String(actor.role);
    if (r === "TRUCKER")
        return "TRUCKER";
    if (r === "BUYER")
        return "BUYER";
    if (["ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR"].includes(r)) {
        return "DEMAXTORE_OPERATIONS";
    }
    return "SYSTEM";
}
function nextAction(status) {
    switch (status) {
        case "DRAFT":
        case "REQUESTED":
            return "Assign trucker";
        case "TRUCKER_ASSIGNED":
            return "Schedule pickup";
        case "PICKUP_SCHEDULED":
            return "Mark ready for pickup";
        case "READY_FOR_PICKUP":
            return "Confirm pickup";
        case "PICKED_UP":
            return "Record gate-out";
        case "GATE_OUT":
            return "Mark in transit";
        case "IN_TRANSIT":
            return "Mark delivered";
        case "DELIVERED":
            return "Upload POD if pending";
        default:
            return null;
    }
}
export function createInlandDeliveryService(db) {
    const issues = new OperationalIssueService(db);
    const tasks = new OperationalTaskService(db);
    async function isCustomsCleared(shipmentWorkspaceId) {
        const cc = await db.customsCase.findUnique({
            where: { shipmentWorkspaceId },
            select: { id: true, status: true },
        });
        if (cc?.status === "CLEARED")
            return { cleared: true, customsCaseId: cc.id };
        const sw = await db.shipmentWorkspace.findUnique({
            where: { workspaceId: shipmentWorkspaceId },
            select: { customsCompletedAt: true },
        });
        return {
            cleared: !!sw?.customsCompletedAt,
            customsCaseId: cc?.id ?? null,
        };
    }
    async function assertAccess(actor, row) {
        const role = String(actor.role);
        if (role === "TRUCKER") {
            const a = await db.partnerAssignment.findFirst({
                where: {
                    workspaceId: row.shipmentWorkspaceId,
                    userId: actor.id,
                    partnerRole: "TRUCKER",
                    revokedAt: null,
                },
                select: { id: true },
            });
            if (!a)
                throw new AppError(403, "PARTNER_NOT_ASSIGNED");
            return "TRUCKER";
        }
        if (["ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR"].includes(role)) {
            return "OPS";
        }
        if (role === "BUYER" || role === "DOCUMENT_CONTROLLER") {
            const ok = await canAccessShipment(db, actor, row.shipmentWorkspaceId);
            if (!ok)
                throw new AppError(403, "INLAND_FORBIDDEN");
            return "BUYER";
        }
        throw new AppError(403, "INLAND_FORBIDDEN");
    }
    async function enrich(row, actor) {
        const sw = await db.shipmentWorkspace.findUnique({
            where: { workspaceId: row.shipmentWorkspaceId },
            select: {
                referenceNumber: true,
                orderRef: true,
                destinationPort: true,
                containerNumber: true,
                customsCompletedAt: true,
            },
        });
        const customs = await isCustomsCleared(row.shipmentWorkspaceId);
        const readyForInland = customs.cleared
            && row.status !== "CANCELLED"
            && row.status !== "DELIVERED"
            && !!row.deliveryAddress;
        const access = actor ? await assertAccess(actor, row).catch(() => null) : null;
        const allowed = [];
        if (access === "BUYER" || access === "OPS") {
            if (["DRAFT", "REQUESTED"].includes(row.status))
                allowed.push("ASSIGN_TRUCKER");
            if (row.status === "TRUCKER_ASSIGNED" || row.status === "PICKUP_SCHEDULED") {
                allowed.push("SCHEDULE_PICKUP");
            }
            if (row.status === "PICKUP_SCHEDULED" && customs.cleared)
                allowed.push("READY_FOR_PICKUP");
            if (access === "OPS" && row.status === "IN_TRANSIT")
                allowed.push("MARK_DELIVERED");
            if (row.status !== "DELIVERED" && row.status !== "CANCELLED")
                allowed.push("CANCEL");
            if (access === "OPS" || access === "BUYER")
                allowed.push("RECORD_COST");
        }
        if (access === "TRUCKER" && (row.status === "TRUCKER_ASSIGNED" || row.status === "PICKUP_SCHEDULED")) {
            allowed.push("SCHEDULE_PICKUP");
        }
        if (access === "TRUCKER" || access === "OPS") {
            if (row.status === "READY_FOR_PICKUP")
                allowed.push("CONFIRM_PICKUP");
            if (row.status === "PICKED_UP")
                allowed.push("GATE_OUT");
            if (row.status === "GATE_OUT")
                allowed.push("IN_TRANSIT");
            if (row.status === "IN_TRANSIT")
                allowed.push("MARK_DELIVERED");
        }
        if ((access === "TRUCKER" || access === "OPS" || access === "BUYER")
            && row.status === "DELIVERED"
            && row.podStatus === "PENDING") {
            allowed.push("UPLOAD_POD");
        }
        // Hide cost from trucker
        const showCost = access !== "TRUCKER";
        return {
            id: row.id,
            organisationId: row.organisationId,
            shipmentWorkspaceId: row.shipmentWorkspaceId,
            orderWorkspaceId: row.orderWorkspaceId,
            customsCaseId: row.customsCaseId,
            status: row.status,
            statusSource: row.statusSource,
            customsCleared: customs.cleared,
            readyForInland,
            shipmentRef: sw?.referenceNumber ?? sw?.orderRef ?? null,
            containerNumber: sw?.containerNumber ?? null,
            destinationPort: sw?.destinationPort ?? null,
            deliveryName: row.deliveryName,
            deliveryAddress: row.deliveryAddress,
            deliveryCity: row.deliveryCity,
            deliveryPostalCode: row.deliveryPostalCode,
            deliveryContactName: row.deliveryContactName,
            deliveryContactPhone: row.deliveryContactPhone,
            pickupLocation: row.pickupLocation,
            pickupAt: iso(row.pickupAt),
            pickupWindow: row.pickupWindow,
            appointmentRef: row.appointmentRef,
            instructions: row.instructions,
            truckerUserId: row.truckerUserId,
            truckerAssignmentId: row.truckerAssignmentId,
            driverName: row.driverName,
            driverPhone: row.driverPhone,
            vehiclePlate: row.vehiclePlate,
            releaseReference: row.releaseReference,
            pickedUpAt: iso(row.pickedUpAt),
            gateOutAt: iso(row.gateOutAt),
            inTransitAt: iso(row.inTransitAt),
            deliveredAt: iso(row.deliveredAt),
            podStatus: row.podStatus,
            podTradeDocumentId: row.podTradeDocumentId,
            inlandCostAmount: showCost && row.inlandCostAmount != null ? Number(row.inlandCostAmount) : null,
            inlandCostCurrency: showCost ? row.inlandCostCurrency : null,
            inlandCostKind: showCost ? row.inlandCostKind : null,
            allowedActions: allowed,
            nextAction: nextAction(row.status),
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        };
    }
    async function recordEvent(id, actor, from, to, reason, payload = {}) {
        await db.inlandDeliveryEvent.create({
            data: {
                inlandDeliveryId: id,
                actorUserId: actor.id,
                source: sourceFor(actor),
                fromStatus: from,
                toStatus: to,
                reason,
                payload,
            },
        });
    }
    async function transition(actor, row, to, reason, extra = {}) {
        const from = row.status;
        if (from === to)
            return row;
        if (!canTransitionInland(from, to)) {
            throw new AppError(409, `INVALID_INLAND_TRANSITION:${from}->${to}`);
        }
        if (INLAND_CUSTOMS_GATED_STATUSES.includes(to)) {
            const { cleared } = await isCustomsCleared(row.shipmentWorkspaceId);
            if (!cleared)
                throw new AppError(409, "CUSTOMS_NOT_CLEARED");
        }
        const data = {
            status: to,
            statusSource: sourceFor(actor),
            updatedById: actor.id,
            ...extra,
        };
        const updated = await db.inlandDelivery.update({ where: { id: row.id }, data });
        await recordEvent(row.id, actor, from, to, reason, extra);
        await syncExceptions(updated);
        return updated;
    }
    async function syncExceptions(row) {
        const { cleared } = await isCustomsCleared(row.shipmentWorkspaceId);
        const keyMissing = `inland_trucker_missing:${row.id}`;
        const keyPickup = `inland_pickup_not_scheduled:${row.id}`;
        const keyPod = `inland_pod_missing:${row.id}`;
        const resolve = async (automationKey) => {
            const open = await db.operationalIssue.findFirst({
                where: {
                    orderId: row.orderWorkspaceId,
                    automationKey,
                    status: { in: ["OPEN", "IN_PROGRESS"] },
                    deletedAt: null,
                },
            });
            if (open) {
                await db.operationalIssue.update({
                    where: { id: open.id },
                    data: { status: "RESOLVED", resolvedAt: new Date(), resolutionNote: "Condition resolved" },
                });
            }
        };
        if (cleared
            && ["REQUESTED", "DRAFT"].includes(row.status)
            && !row.truckerUserId) {
            const task = await tasks.ensureAutomatedTask({
                orderId: row.orderWorkspaceId,
                automationKey: `task:${keyMissing}`,
                title: "Assign inland trucker",
                description: "Customs cleared — assign transport partner for inland delivery",
                priority: "HIGH",
                relatedEntityType: "SHIPMENT",
                relatedEntityId: row.shipmentWorkspaceId,
                dueInDays: 1,
            });
            await issues.ensureAutomatedIssue({
                orderId: row.orderWorkspaceId,
                automationKey: keyMissing,
                title: "Inland trucker missing",
                description: "Delivery requested after customs clearance without trucker assignment",
                category: "OTHER",
                severity: "HIGH",
                relatedEntityType: "SHIPMENT",
                relatedEntityId: row.shipmentWorkspaceId,
                assignedTaskId: task.id,
                impactType: "INLAND_EXECUTION_RISK",
                ownerRole: "OPERATIONS",
                recommendedAction: "Assign TRUCKER partner",
                sourceEventType: "INLAND_TRUCKER_MISSING",
                sourceRuleId: "RULE_INLAND_TRUCKER_MISSING",
            });
        }
        else if (row.truckerUserId) {
            await resolve(keyMissing);
        }
        if (row.truckerUserId
            && !row.pickupAt
            && ["TRUCKER_ASSIGNED", "READY_FOR_PICKUP"].includes(row.status)) {
            const task = await tasks.ensureAutomatedTask({
                orderId: row.orderWorkspaceId,
                automationKey: `task:${keyPickup}`,
                title: "Schedule inland pickup",
                priority: "HIGH",
                relatedEntityType: "SHIPMENT",
                relatedEntityId: row.shipmentWorkspaceId,
                dueInDays: 1,
            });
            await issues.ensureAutomatedIssue({
                orderId: row.orderWorkspaceId,
                automationKey: keyPickup,
                title: "Pickup not scheduled",
                description: "Trucker assigned but pickup date/window missing",
                category: "OTHER",
                severity: "MEDIUM",
                relatedEntityType: "SHIPMENT",
                relatedEntityId: row.shipmentWorkspaceId,
                assignedTaskId: task.id,
                impactType: "INLAND_EXECUTION_RISK",
                ownerRole: "OPERATIONS",
                recommendedAction: "Schedule pickup",
                sourceEventType: "PICKUP_NOT_SCHEDULED",
                sourceRuleId: "RULE_INLAND_PICKUP_NOT_SCHEDULED",
            });
        }
        else if (row.pickupAt) {
            await resolve(keyPickup);
        }
        // Pickup overdue
        if (row.pickupAt
            && row.pickupAt.getTime() < Date.now()
            && !["PICKED_UP", "GATE_OUT", "IN_TRANSIT", "DELIVERED", "CANCELLED"].includes(row.status)) {
            const key = `inland_pickup_overdue:${row.id}`;
            await issues.ensureAutomatedIssue({
                orderId: row.orderWorkspaceId,
                automationKey: key,
                title: "Pickup overdue",
                description: `Scheduled pickup ${row.pickupAt.toISOString()} has passed`,
                category: "SHIPMENT_DELAY",
                severity: "HIGH",
                relatedEntityType: "SHIPMENT",
                relatedEntityId: row.shipmentWorkspaceId,
                impactType: "DELIVERY_RISK",
                ownerRole: "OPERATIONS",
                recommendedAction: "Confirm pickup or reschedule",
                sourceEventType: "PICKUP_OVERDUE",
                sourceRuleId: "RULE_INLAND_PICKUP_OVERDUE",
            });
        }
        else if (["PICKED_UP", "GATE_OUT", "IN_TRANSIT", "DELIVERED"].includes(row.status)) {
            await resolve(`inland_pickup_overdue:${row.id}`);
        }
        if (row.status === "DELIVERED" && row.podStatus !== "AVAILABLE") {
            const task = await tasks.ensureAutomatedTask({
                orderId: row.orderWorkspaceId,
                automationKey: `task:${keyPod}`,
                title: "Upload Proof of Delivery",
                priority: "MEDIUM",
                relatedEntityType: "DOCUMENT",
                relatedEntityId: row.shipmentWorkspaceId,
                dueInDays: 2,
            });
            await issues.ensureAutomatedIssue({
                orderId: row.orderWorkspaceId,
                automationKey: keyPod,
                title: "POD missing",
                description: "Delivery marked delivered but Proof of Delivery not uploaded",
                category: "DOCUMENT_MISSING",
                severity: "MEDIUM",
                relatedEntityType: "SHIPMENT",
                relatedEntityId: row.shipmentWorkspaceId,
                assignedTaskId: task.id,
                impactType: "INLAND_EXECUTION_RISK",
                ownerRole: "OPERATIONS",
                recommendedAction: "Upload PROOF_OF_DELIVERY trade document",
                sourceEventType: "POD_MISSING",
                sourceRuleId: "RULE_INLAND_POD_MISSING",
            });
        }
        else if (row.podStatus === "AVAILABLE") {
            await resolve(keyPod);
        }
    }
    async function syncTruckerFromAssignment(row) {
        const a = await db.partnerAssignment.findFirst({
            where: {
                workspaceId: row.shipmentWorkspaceId,
                partnerRole: "TRUCKER",
                revokedAt: null,
            },
            orderBy: { createdAt: "desc" },
        });
        if (!a) {
            return db.inlandDelivery.update({
                where: { id: row.id },
                data: { truckerUserId: null, truckerAssignmentId: null },
            });
        }
        return db.inlandDelivery.update({
            where: { id: row.id },
            data: { truckerUserId: a.userId, truckerAssignmentId: a.id },
        });
    }
    return {
        async request(actor, input) {
            const role = String(actor.role);
            if (!["BUYER", "ADMIN", "SUPER_ADMIN", "OPS_MANAGER", "LOGISTICS_OPERATOR"].includes(role)) {
                throw new AppError(403, "INLAND_FORBIDDEN");
            }
            const sw = await db.shipmentWorkspace.findUnique({
                where: { workspaceId: input.shipmentWorkspaceId },
            });
            if (!sw)
                throw new AppError(404, "SHIPMENT_NOT_FOUND");
            const ok = await canAccessShipment(db, actor, sw.workspaceId);
            if (!ok && role !== "ADMIN" && role !== "SUPER_ADMIN") {
                throw new AppError(403, "INLAND_FORBIDDEN");
            }
            const existing = await db.inlandDelivery.findUnique({
                where: { shipmentWorkspaceId: sw.workspaceId },
            });
            if (existing && existing.status !== "CANCELLED") {
                return enrich(existing, actor);
            }
            const buyer = await db.user.findUnique({
                where: { id: sw.buyerUserId },
                select: { organisationId: true },
            });
            if (!buyer?.organisationId)
                throw new AppError(400, "SHIPMENT_BUYER_ORG_MISSING");
            const customs = await isCustomsCleared(sw.workspaceId);
            const pickupLocation = input.pickupLocation?.trim()
                || (sw.destinationPort ? `Terminal / POD ${sw.destinationPort}` : null);
            const created = existing
                ? await db.inlandDelivery.update({
                    where: { id: existing.id },
                    data: {
                        status: "REQUESTED",
                        cancelledAt: null,
                        cancelReason: null,
                        deliveryName: input.deliveryName ?? null,
                        deliveryAddress: input.deliveryAddress,
                        deliveryCity: input.deliveryCity ?? null,
                        deliveryPostalCode: input.deliveryPostalCode ?? null,
                        deliveryContactName: input.deliveryContactName ?? null,
                        deliveryContactPhone: input.deliveryContactPhone ?? null,
                        pickupLocation,
                        pickupAt: input.preferredPickupAt ? new Date(input.preferredPickupAt) : null,
                        instructions: input.instructions ?? null,
                        customsCaseId: customs.customsCaseId,
                        statusSource: sourceFor(actor),
                        updatedById: actor.id,
                        podStatus: "PENDING",
                    },
                })
                : await db.inlandDelivery.create({
                    data: {
                        organisationId: buyer.organisationId,
                        shipmentWorkspaceId: sw.workspaceId,
                        orderWorkspaceId: sw.orderWorkspaceId,
                        customsCaseId: customs.customsCaseId,
                        status: "REQUESTED",
                        statusSource: sourceFor(actor),
                        deliveryName: input.deliveryName ?? null,
                        deliveryAddress: input.deliveryAddress,
                        deliveryCity: input.deliveryCity ?? null,
                        deliveryPostalCode: input.deliveryPostalCode ?? null,
                        deliveryContactName: input.deliveryContactName ?? null,
                        deliveryContactPhone: input.deliveryContactPhone ?? null,
                        pickupLocation,
                        pickupAt: input.preferredPickupAt ? new Date(input.preferredPickupAt) : null,
                        instructions: input.instructions ?? null,
                        createdById: actor.id,
                        podStatus: "PENDING",
                    },
                });
            await recordEvent(created.id, actor, existing?.status ?? "DRAFT", "REQUESTED", "INLAND_REQUESTED");
            await syncExceptions(created);
            return enrich(created, actor);
        },
        async get(actor, id) {
            const row = await db.inlandDelivery.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "INLAND_DELIVERY_NOT_FOUND");
            await assertAccess(actor, row);
            return enrich(row, actor);
        },
        async getByShipment(actor, shipmentWorkspaceId) {
            const row = await db.inlandDelivery.findUnique({ where: { shipmentWorkspaceId } });
            if (!row)
                return null;
            await assertAccess(actor, row);
            return enrich(row, actor);
        },
        async list(actor, query = {}) {
            const role = String(actor.role);
            if (role === "TRUCKER")
                throw new AppError(403, "INLAND_FORBIDDEN");
            const where = { status: { not: "CANCELLED" } };
            if (query.status)
                where.status = query.status;
            if (role === "BUYER") {
                const u = await db.user.findUnique({
                    where: { id: actor.id },
                    select: { organisationId: true },
                });
                if (!u?.organisationId)
                    return { items: [] };
                where.organisationId = u.organisationId;
            }
            if (query.attention) {
                where.status = {
                    in: ["REQUESTED", "TRUCKER_ASSIGNED", "PICKUP_SCHEDULED", "READY_FOR_PICKUP", "IN_TRANSIT"],
                };
            }
            const rows = await db.inlandDelivery.findMany({
                where,
                orderBy: { updatedAt: "desc" },
                take: 80,
            });
            const items = await Promise.all(rows.map((r) => enrich(r, actor)));
            return { items };
        },
        async syncTrucker(actor, id) {
            const row = await db.inlandDelivery.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "INLAND_DELIVERY_NOT_FOUND");
            await assertAccess(actor, row);
            let updated = await syncTruckerFromAssignment(row);
            if (updated.truckerUserId && ["REQUESTED", "DRAFT"].includes(updated.status)) {
                updated = await transition(actor, updated, "TRUCKER_ASSIGNED", "TRUCKER_ASSIGNED");
            }
            return enrich(updated, actor);
        },
        async schedulePickup(actor, id, input) {
            const row = await db.inlandDelivery.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "INLAND_DELIVERY_NOT_FOUND");
            const access = await assertAccess(actor, row);
            if (access === "TRUCKER" && String(actor.role) === "TRUCKER") {
                // trucker may schedule if assigned
            }
            else if (access !== "BUYER" && access !== "OPS" && access !== "TRUCKER") {
                throw new AppError(403, "INLAND_FORBIDDEN");
            }
            let current = row;
            if (current.status === "REQUESTED" && current.truckerUserId) {
                current = await transition(actor, current, "TRUCKER_ASSIGNED", "TRUCKER_ASSIGNED");
            }
            if (current.status === "REQUESTED" && !current.truckerUserId) {
                current = await syncTruckerFromAssignment(current);
                if (current.truckerUserId) {
                    current = await transition(actor, current, "TRUCKER_ASSIGNED", "TRUCKER_ASSIGNED");
                }
            }
            if (!["TRUCKER_ASSIGNED", "PICKUP_SCHEDULED"].includes(current.status)) {
                throw new AppError(409, `INVALID_INLAND_TRANSITION:${current.status}->PICKUP_SCHEDULED`);
            }
            const data = {
                pickupAt: new Date(input.pickupAt),
                pickupWindow: input.pickupWindow ?? null,
                appointmentRef: input.appointmentRef ?? null,
                pickupLocation: input.pickupLocation ?? current.pickupLocation,
                instructions: input.instructions ?? current.instructions,
                driverName: input.driverName ?? null,
                driverPhone: input.driverPhone ?? null,
                vehiclePlate: input.vehiclePlate ?? null,
            };
            if (current.status === "PICKUP_SCHEDULED") {
                const updated = await db.inlandDelivery.update({
                    where: { id },
                    data: { ...data, updatedById: actor.id },
                });
                await recordEvent(id, actor, current.status, current.status, "PICKUP_SCHEDULED", data);
                await syncExceptions(updated);
                return enrich(updated, actor);
            }
            const updated = await transition(actor, current, "PICKUP_SCHEDULED", "PICKUP_SCHEDULED", data);
            return enrich(updated, actor);
        },
        async readyForPickup(actor, id) {
            const row = await db.inlandDelivery.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "INLAND_DELIVERY_NOT_FOUND");
            await assertAccess(actor, row);
            const updated = await transition(actor, row, "READY_FOR_PICKUP", "READY_FOR_PICKUP");
            return enrich(updated, actor);
        },
        async confirmPickup(actor, id, input = {}) {
            const row = await db.inlandDelivery.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "INLAND_DELIVERY_NOT_FOUND");
            const access = await assertAccess(actor, row);
            if (access !== "TRUCKER" && access !== "OPS")
                throw new AppError(403, "INLAND_FORBIDDEN");
            if (row.status === "PICKED_UP")
                return enrich(row, actor);
            const ts = input.timestamp ? new Date(input.timestamp) : new Date();
            const updated = await transition(actor, row, "PICKED_UP", "PICKUP_CONFIRMED", {
                pickedUpAt: ts,
            });
            return enrich(updated, actor);
        },
        async gateOut(actor, id, input = {}) {
            const row = await db.inlandDelivery.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "INLAND_DELIVERY_NOT_FOUND");
            const access = await assertAccess(actor, row);
            if (access !== "TRUCKER" && access !== "OPS")
                throw new AppError(403, "INLAND_FORBIDDEN");
            if (row.status === "GATE_OUT")
                return enrich(row, actor);
            const ts = input.timestamp ? new Date(input.timestamp) : new Date();
            const updated = await transition(actor, row, "GATE_OUT", "GATE_OUT_RECORDED", {
                gateOutAt: ts,
            });
            return enrich(updated, actor);
        },
        async inTransit(actor, id, input = {}) {
            const row = await db.inlandDelivery.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "INLAND_DELIVERY_NOT_FOUND");
            const access = await assertAccess(actor, row);
            if (access !== "TRUCKER" && access !== "OPS")
                throw new AppError(403, "INLAND_FORBIDDEN");
            if (row.status === "IN_TRANSIT")
                return enrich(row, actor);
            const ts = input.timestamp ? new Date(input.timestamp) : new Date();
            const updated = await transition(actor, row, "IN_TRANSIT", "IN_TRANSIT", {
                inTransitAt: ts,
            });
            return enrich(updated, actor);
        },
        async markDelivered(actor, id, input = {}) {
            const row = await db.inlandDelivery.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "INLAND_DELIVERY_NOT_FOUND");
            const access = await assertAccess(actor, row);
            if (access !== "TRUCKER" && access !== "OPS")
                throw new AppError(403, "INLAND_FORBIDDEN");
            if (row.status === "DELIVERED")
                return enrich(row, actor);
            // Allow step-through from GATE_OUT if needed
            let current = row;
            if (current.status === "GATE_OUT") {
                current = await transition(actor, current, "IN_TRANSIT", "Auto-advance before delivery");
            }
            const ts = input.timestamp ? new Date(input.timestamp) : new Date();
            const updated = await transition(actor, current, "DELIVERED", "DELIVERED", {
                deliveredAt: ts,
            });
            // Sync shipment deliveredAt (do not touch customs)
            await db.shipmentWorkspace.update({
                where: { workspaceId: updated.shipmentWorkspaceId },
                data: { deliveredAt: ts },
            });
            // Completion evidence
            await db.deliveryRecord.create({
                data: {
                    orderId: updated.orderWorkspaceId,
                    shipmentId: updated.shipmentWorkspaceId,
                    deliveredAt: ts,
                    deliveredBy: actor.email ?? actor.id,
                    remarks: input.note ?? "Inland delivery completed",
                    recordedById: actor.id,
                    proofDocumentId: updated.podTradeDocumentId,
                },
            });
            return enrich(updated, actor);
        },
        async linkPod(actor, id, tradeDocumentId) {
            const row = await db.inlandDelivery.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "INLAND_DELIVERY_NOT_FOUND");
            await assertAccess(actor, row);
            const doc = await db.tradeDocument.findUnique({ where: { id: tradeDocumentId } });
            if (!doc || doc.documentType !== "PROOF_OF_DELIVERY") {
                throw new AppError(400, "POD_DOCUMENT_REQUIRED");
            }
            if (!((doc.workspaceType === "SHIPMENT" && doc.workspaceId === row.shipmentWorkspaceId)
                || (doc.workspaceType === "ORDER" && doc.workspaceId === row.orderWorkspaceId))) {
                throw new AppError(403, "POD_DOCUMENT_MISMATCH");
            }
            // Idempotent: same document already linked
            if (row.podStatus === "AVAILABLE" && row.podTradeDocumentId === tradeDocumentId) {
                return enrich(row, actor);
            }
            if (row.podStatus === "AVAILABLE"
                && row.podTradeDocumentId
                && row.podTradeDocumentId !== tradeDocumentId) {
                throw new AppError(409, "POD_ALREADY_LINKED");
            }
            const updated = await db.inlandDelivery.update({
                where: { id },
                data: {
                    podTradeDocumentId: tradeDocumentId,
                    podStatus: "AVAILABLE",
                    updatedById: actor.id,
                },
            });
            await recordEvent(id, actor, row.status, row.status, "POD_UPLOADED", {
                tradeDocumentId,
            });
            await syncExceptions(updated);
            return enrich(updated, actor);
        },
        async recordCost(actor, id, input) {
            const row = await db.inlandDelivery.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "INLAND_DELIVERY_NOT_FOUND");
            const access = await assertAccess(actor, row);
            if (access === "TRUCKER")
                throw new AppError(403, "INLAND_COST_FORBIDDEN");
            const updated = await db.inlandDelivery.update({
                where: { id },
                data: {
                    inlandCostAmount: input.amount,
                    inlandCostCurrency: input.currency,
                    inlandCostKind: input.kind,
                    inlandCostSource: input.source,
                    updatedById: actor.id,
                },
            });
            try {
                await createLandedCostService(db).calculate(actor, {
                    shipmentWorkspaceId: updated.shipmentWorkspaceId,
                    calculationCurrency: "USD",
                    fxRates: { TRY: 1 / 34, EUR: 1.08 },
                });
            }
            catch {
                // Cost persisted; buyer can Recalculate LC from shipment UI.
            }
            return enrich(updated, actor);
        },
        async cancel(actor, id, input) {
            const row = await db.inlandDelivery.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "INLAND_DELIVERY_NOT_FOUND");
            await assertAccess(actor, row);
            if (["PICKED_UP", "GATE_OUT", "IN_TRANSIT", "DELIVERED"].includes(row.status)) {
                throw new AppError(409, "INLAND_CANCEL_NOT_ALLOWED");
            }
            if (row.status === "CANCELLED")
                return enrich(row, actor);
            const updated = await transition(actor, row, "CANCELLED", "INLAND_CANCELLED", {
                cancelledAt: new Date(),
                cancelReason: input.reason,
            });
            return enrich(updated, actor);
        },
        async events(actor, id) {
            const row = await db.inlandDelivery.findUnique({ where: { id } });
            if (!row)
                throw new AppError(404, "INLAND_DELIVERY_NOT_FOUND");
            await assertAccess(actor, row);
            return db.inlandDeliveryEvent.findMany({
                where: { inlandDeliveryId: id },
                orderBy: { createdAt: "desc" },
                take: 100,
            });
        },
    };
}
//# sourceMappingURL=inland-delivery.service.js.map