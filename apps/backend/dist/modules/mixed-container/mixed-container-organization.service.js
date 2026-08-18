import { ORGANIZATION_STATUS_LABELS, ORGANIZATION_STATUSES, organizationStatusIndex, isOrganizationStepComplete, } from "@dmx/contracts/mixed-container-organization";
import { AppError } from "../../utils/httpErrors.js";
import { assertCanAccessMixedContainer, assertCanManageOrganization } from "./mixed-container.policy.js";
import { nextOrRef, notifyBuyerOrganizationEvent, notifyOrganizationCreated, recordOrganizationStatusHistory, } from "./mc-organization.helpers.js";
import { logger } from "../../config/logger.js";
import { MixedContainerExecutionService } from "./mixed-container-execution.service.js";
import { getLatestModuleActivity } from "./mc-organization-sync.service.js";
const MODULE_TEAMS = {
    PURCHASE_ORDERS: "Operations Team",
    PROFORMA_INVOICES: "Finance Team",
    FREIGHTIQ: "Logistics Team",
    DOCUMENTS_HUB: "Document Controller",
    INSPECTION: "Quality Team",
    SHIPMENT_TRACKING: "Logistics Team",
};
async function appendTimeline(tx, workspaceId, eventType, actorUserId, payload = {}) {
    await tx.timelineEvent.create({
        data: { workspaceId, eventType, actorUserId, payload: payload },
    });
}
export class MixedContainerOrganizationService {
    prisma;
    execution;
    constructor(prisma, execution = new MixedContainerExecutionService(prisma)) {
        this.prisma = prisma;
        this.execution = execution;
    }
    async createOrganization(tx, workspaceId, actorUserId, buyerUserId) {
        const details = await tx.mixedContainerDetails.findUniqueOrThrow({ where: { workspaceId } });
        if (details.organizationRef)
            return details.organizationRef;
        const organizationRef = await nextOrRef(tx);
        const status = "ORGANIZATION_STARTED";
        const now = new Date();
        await tx.mixedContainerDetails.update({
            where: { workspaceId },
            data: {
                organizationRef,
                organizationStatus: status,
                organizationStartedAt: now,
            },
        });
        await recordOrganizationStatusHistory(tx, {
            workspaceId,
            fromStatus: null,
            toStatus: status,
            actorUserId,
            note: "Organization workspace created",
        });
        await notifyOrganizationCreated(tx, {
            workspaceId,
            buyerUserId,
            organizationRef,
        });
        logger.info({ workspaceId, organizationRef, actorUserId }, "[MC] Organization workspace created");
        const { bridgeModuleEventToOrganization } = await import("./mc-organization-sync.service.js");
        await bridgeModuleEventToOrganization(tx, {
            organizationWorkspaceId: workspaceId,
            sourceModule: "DOCUMENTS_HUB",
            sourceEventType: "mixed_container.organization_created",
            sourceEntityId: workspaceId,
            actorUserId,
            payload: { organizationRef },
        });
        return organizationRef;
    }
    async getOrganization(workspaceId, actor, includeInternalNotes = false) {
        await assertCanAccessMixedContainer(this.prisma, actor, workspaceId);
        const ws = await this.prisma.workspace.findUniqueOrThrow({
            where: { id: workspaceId },
            include: {
                mixedContainerDetails: true,
                createdBy: { select: { displayName: true, organisation: { select: { name: true } } } },
                mcOrganizationStatusHistory: { orderBy: { createdAt: "desc" }, take: 100 },
                mcOrganizationEvents: { orderBy: { createdAt: "desc" }, take: 200 },
                mcOrderLinks: true,
                mcSupplierAllocations: {
                    include: { proformas: true, payments: true, containerLine: { include: { catalogProduct: true } } },
                    orderBy: { sortOrder: "asc" },
                },
                mcSupplierProformas: true,
                ...(includeInternalNotes && actor.role === "ADMIN"
                    ? { mcInternalNotes: { orderBy: { createdAt: "desc" }, take: 50 } }
                    : {}),
            },
        });
        if (ws.type !== "MIXED_CONTAINER")
            throw new AppError(409, "WRONG_WORKSPACE_TYPE");
        const d = ws.mixedContainerDetails;
        if (!d?.organizationRef || !d.organizationStatus) {
            throw new AppError(404, "ORGANIZATION_NOT_FOUND");
        }
        const execution = await this.execution.getExecution(workspaceId, actor, { readOnly: true });
        const orderIds = ws.mcOrderLinks.map((l) => l.supplierOrderId);
        const moduleActivity = await getLatestModuleActivity(this.prisma, workspaceId);
        const shipments = orderIds.length > 0
            ? await this.prisma.workspace.findMany({
                where: { spawnedFromId: { in: orderIds }, type: "SHIPMENT" },
                orderBy: { updatedAt: "desc" },
            })
            : [];
        const shipmentIds = shipments.map((s) => s.id);
        const [orders, pos, freightReqs, orderDocs, shipDocs, inspections] = await Promise.all([
            orderIds.length
                ? this.prisma.workspace.findMany({ where: { id: { in: orderIds } }, include: { orderWorkspace: true } })
                : [],
            orderIds.length
                ? this.prisma.purchaseOrder.findMany({ where: { orderId: { in: orderIds } }, orderBy: { updatedAt: "desc" } })
                : [],
            orderIds.length
                ? this.prisma.freightRequest.findMany({ where: { orderId: { in: orderIds } }, orderBy: { updatedAt: "desc" } })
                : [],
            orderIds.length ? this.prisma.orderDocument.findMany({ where: { workspaceId: { in: orderIds } } }) : [],
            shipmentIds.length ? this.prisma.shipmentDocument.findMany({ where: { workspaceId: { in: shipmentIds } } }) : [],
            orderIds.length
                ? this.prisma.workspace.findMany({
                    where: { id: { in: orderIds }, state: { in: ["INSPECTION_PENDING", "INSPECTION_COMPLETED", "INSPECTION_FAILED"] } },
                })
                : [],
        ]);
        let opsManagerName = null;
        if (d.assignedOperationsManagerId) {
            const mgr = await this.prisma.user.findUnique({
                where: { id: d.assignedOperationsManagerId },
                select: { displayName: true },
            });
            opsManagerName = mgr?.displayName ?? null;
        }
        const actorIds = [
            ...ws.mcOrganizationStatusHistory.map((h) => h.actorUserId),
            ...ws.mcOrganizationEvents.map((e) => e.actorUserId),
        ].filter(Boolean);
        const actors = actorIds.length > 0
            ? await this.prisma.user.findMany({ where: { id: { in: [...new Set(actorIds)] } }, select: { id: true, displayName: true } })
            : [];
        const actorMap = new Map(actors.map((a) => [a.id, a.displayName]));
        const primaryOrderId = orderIds[0] ?? null;
        const primaryShipment = shipments[0] ?? null;
        const tradeUrl = `/workspace/trade/${workspaceId}`;
        const modules = [
            {
                key: "PURCHASE_ORDERS",
                label: "Purchase Orders",
                status: pos.length === 0 ? "Not started" : pos.every((p) => p.status === "CLOSED") ? "Completed" : pos.some((p) => p.status === "ISSUED") ? "Active" : "Pending",
                lastActivity: moduleActivity.get("PURCHASE_ORDERS")?.label ?? null,
                lastUpdate: moduleActivity.get("PURCHASE_ORDERS")?.createdAt.toISOString() ?? pos[0]?.updatedAt.toISOString() ?? null,
                responsibleTeam: MODULE_TEAMS.PURCHASE_ORDERS,
                workspaceUrl: primaryOrderId ? `/workspace/order/${primaryOrderId}` : tradeUrl,
                workspaceId: primaryOrderId,
            },
            {
                key: "PROFORMA_INVOICES",
                label: "Proforma Invoices",
                status: ws.mcSupplierProformas.length === 0
                    ? "Pending"
                    : ws.mcSupplierProformas.every((p) => p.status === "UPLOADED" || p.status === "BUYER_REVIEWED")
                        ? "Completed"
                        : "In progress",
                lastActivity: moduleActivity.get("PROFORMA_INVOICES")?.label ?? null,
                lastUpdate: moduleActivity.get("PROFORMA_INVOICES")?.createdAt.toISOString() ?? ws.mcSupplierProformas[0]?.updatedAt?.toISOString() ?? null,
                responsibleTeam: MODULE_TEAMS.PROFORMA_INVOICES,
                workspaceUrl: `/buyer/mixed-container/coordination/${workspaceId}`,
                workspaceId,
            },
            {
                key: "FREIGHTIQ",
                label: "FreightIQ",
                status: freightReqs.length === 0 ? "Not started" : freightReqs[0].status.replace(/_/g, " "),
                lastActivity: moduleActivity.get("FREIGHTIQ")?.label ?? null,
                lastUpdate: moduleActivity.get("FREIGHTIQ")?.createdAt.toISOString() ?? freightReqs[0]?.updatedAt.toISOString() ?? null,
                responsibleTeam: MODULE_TEAMS.FREIGHTIQ,
                workspaceUrl: primaryOrderId ? `/workspace/order/${primaryOrderId}` : tradeUrl,
                workspaceId: primaryOrderId,
            },
            {
                key: "DOCUMENTS_HUB",
                label: "Documents Hub",
                status: orderDocs.length + shipDocs.length + ws.mcSupplierProformas.length === 0 ? "Empty" : `${orderDocs.length + shipDocs.length + ws.mcSupplierProformas.length} documents`,
                lastActivity: moduleActivity.get("DOCUMENTS_HUB")?.label ?? null,
                lastUpdate: moduleActivity.get("DOCUMENTS_HUB")?.createdAt.toISOString() ?? [...orderDocs, ...shipDocs].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0]?.uploadedAt.toISOString() ?? null,
                responsibleTeam: MODULE_TEAMS.DOCUMENTS_HUB,
                workspaceUrl: tradeUrl,
                workspaceId,
            },
            {
                key: "INSPECTION",
                label: "Inspection",
                status: inspections.length === 0
                    ? orders.some((o) => ["INSPECTION_PENDING", "INSPECTION_COMPLETED"].includes(o.state))
                        ? orders.find((o) => o.state.startsWith("INSPECTION")).state.replace(/_/g, " ")
                        : "Not scheduled"
                    : inspections[0].state.replace(/_/g, " "),
                lastActivity: moduleActivity.get("INSPECTION")?.label ?? null,
                lastUpdate: moduleActivity.get("INSPECTION")?.createdAt.toISOString() ?? inspections[0]?.updatedAt.toISOString() ?? orders.find((o) => o.state.includes("INSPECTION"))?.updatedAt.toISOString() ?? null,
                responsibleTeam: MODULE_TEAMS.INSPECTION,
                workspaceUrl: primaryOrderId ? `/workspace/order/${primaryOrderId}` : tradeUrl,
                workspaceId: primaryOrderId,
            },
            {
                key: "SHIPMENT_TRACKING",
                label: "Live Shipment Tracking",
                status: primaryShipment ? primaryShipment.state.replace(/_/g, " ") : "Not booked",
                lastActivity: moduleActivity.get("SHIPMENT_TRACKING")?.label ?? null,
                lastUpdate: moduleActivity.get("SHIPMENT_TRACKING")?.createdAt.toISOString() ?? primaryShipment?.updatedAt.toISOString() ?? null,
                responsibleTeam: MODULE_TEAMS.SHIPMENT_TRACKING,
                workspaceUrl: primaryShipment ? `/workspace/shipment/${primaryShipment.id}` : tradeUrl,
                workspaceId: primaryShipment?.id ?? null,
            },
        ];
        const outstandingTasks = [];
        if (ws.mcSupplierAllocations.length > 0 && ws.mcSupplierProformas.length < ws.mcSupplierAllocations.length) {
            outstandingTasks.push({
                id: "task-proforma-pending",
                title: "Waiting for proforma invoice",
                moduleKey: "PROFORMA_INVOICES",
                priority: "HIGH",
                status: "OPEN",
            });
        }
        if (orderIds.length > 0 && !orders.some((o) => o.state.includes("INSPECTION"))) {
            outstandingTasks.push({
                id: "task-inspection",
                title: "Inspection required",
                moduleKey: "INSPECTION",
                priority: "NORMAL",
                status: "OPEN",
            });
        }
        if (orderDocs.length + shipDocs.length === 0 && orderIds.length > 0) {
            outstandingTasks.push({
                id: "task-documents",
                title: "Missing documents",
                moduleKey: "DOCUMENTS_HUB",
                priority: "NORMAL",
                status: "OPEN",
            });
        }
        if (orderIds.length === 0 && ws.mcSupplierAllocations.length > 0) {
            outstandingTasks.push({
                id: "task-spawn-orders",
                title: "Spawn supplier execution orders",
                moduleKey: "PURCHASE_ORDERS",
                priority: "HIGH",
                status: "OPEN",
            });
        }
        if (freightReqs.length === 0 && orderIds.length > 0) {
            outstandingTasks.push({
                id: "task-freight",
                title: "Shipment booking pending",
                moduleKey: "FREIGHTIQ",
                priority: "NORMAL",
                status: "OPEN",
            });
        }
        if (shipments.length > 0 && !shipments.some((s) => ["LOADED", "DEPARTED", "IN_TRANSIT"].some((k) => s.state.includes(k)))) {
            outstandingTasks.push({
                id: "task-loading",
                title: "Container loading pending",
                moduleKey: "SHIPMENT_TRACKING",
                priority: "NORMAL",
                status: "OPEN",
            });
        }
        if (shipments.length === 0 && freightReqs.some((f) => f.status === "CONVERTED_TO_SHIPMENT")) {
            outstandingTasks.push({
                id: "task-shipment",
                title: "Confirm shipment booking",
                moduleKey: "SHIPMENT_TRACKING",
                priority: "NORMAL",
                status: "OPEN",
            });
        }
        const orgStatus = d.organizationStatus;
        const upcomingMilestones = ORGANIZATION_STATUSES.filter((s) => !isOrganizationStepComplete(s, orgStatus) && s !== orgStatus)
            .slice(0, 5)
            .map((key) => ({
            key,
            label: ORGANIZATION_STATUS_LABELS[key],
            targetDate: null,
            completed: false,
        }));
        const orgEvents = ws.mcOrganizationEvents;
        const lastSyncedAt = orgEvents[0]?.createdAt.toISOString() ?? d.organizationStartedAt?.toISOString() ?? null;
        const synchronizationStatus = orgEvents.length > 0 && lastSyncedAt && Date.now() - new Date(lastSyncedAt).getTime() < 120_000
            ? "LIVE"
            : orgEvents.length > 0
                ? "SYNCED"
                : "PENDING";
        const activityTimeline = orgEvents.map((e) => ({
            id: e.id,
            sourceModule: e.sourceModule,
            eventType: e.canonicalEventType,
            label: e.label,
            actorUserId: e.actorUserId,
            actorName: e.actorUserId ? actorMap.get(e.actorUserId) ?? null : null,
            payload: (e.payload ?? {}),
            createdAt: e.createdAt.toISOString(),
        }));
        const responsibleTeams = [
            { team: "Operations Team", role: "Import execution coordination" },
            { team: "Finance Team", role: "Proforma and payment coordination" },
            { team: "Logistics Team", role: "Freight and shipment management" },
            { team: "Quality Team", role: "Inspection coordination" },
            { team: "Document Controller", role: "Document hub management" },
        ];
        let internalNotes;
        if (includeInternalNotes && actor.role === "ADMIN" && "mcInternalNotes" in ws) {
            const notes = ws.mcInternalNotes;
            const noteAuthors = notes.length > 0
                ? await this.prisma.user.findMany({
                    where: { id: { in: notes.map((n) => n.authorId) } },
                    select: { id: true, displayName: true },
                })
                : [];
            const noteAuthorMap = new Map(noteAuthors.map((a) => [a.id, a.displayName]));
            internalNotes = notes.map((n) => ({
                id: n.id,
                authorName: noteAuthorMap.get(n.authorId) ?? "Staff",
                body: n.body,
                createdAt: n.createdAt.toISOString(),
            }));
        }
        return {
            workspaceId: ws.id,
            organizationRef: d.organizationRef,
            procurementRequestRef: d.procurementRequestRef,
            commercialProposalRef: d.commercialProposalRef,
            buyerName: ws.createdBy.displayName,
            buyerOrgName: ws.createdBy.organisation?.name ?? null,
            destinationCountry: d.destinationMarket?.split(",")[0]?.trim() ?? d.destinationMarket,
            destinationPort: d.destinationMarket,
            assignedOperationsManagerId: d.assignedOperationsManagerId,
            assignedOperationsManagerName: opsManagerName,
            organizationStatus: orgStatus,
            workspaceState: ws.state,
            createdAt: d.organizationStartedAt?.toISOString() ?? ws.createdAt.toISOString(),
            organizationStartedAt: d.organizationStartedAt?.toISOString() ?? null,
            executionProgressPercent: execution.completionPercent,
            modules,
            statusHistory: ws.mcOrganizationStatusHistory.map((h) => ({
                id: h.id,
                fromStatus: h.fromStatus,
                toStatus: h.toStatus,
                actorUserId: h.actorUserId,
                actorName: h.actorUserId ? actorMap.get(h.actorUserId) ?? null : null,
                note: h.note,
                createdAt: h.createdAt.toISOString(),
            })),
            activityTimeline,
            outstandingTasks,
            upcomingMilestones,
            responsibleTeams,
            lastSyncedAt,
            synchronizationStatus,
            ...(internalNotes ? { internalNotes } : {}),
        };
    }
    async updateStatus(workspaceId, input, actor) {
        await assertCanManageOrganization(this.prisma, actor, workspaceId);
        await this.prisma.$transaction(async (tx) => {
            const ws = await tx.workspace.findUniqueOrThrow({
                where: { id: workspaceId },
                include: { mixedContainerDetails: true },
            });
            if (!ws.mixedContainerDetails?.organizationRef)
                throw new AppError(404, "ORGANIZATION_NOT_FOUND");
            const fromStatus = (ws.mixedContainerDetails.organizationStatus ?? "ORGANIZATION_STARTED");
            const toStatus = input.status;
            if (fromStatus === toStatus)
                return;
            if (organizationStatusIndex(toStatus) < organizationStatusIndex(fromStatus)) {
                throw new AppError(409, "ORGANIZATION_STATUS_BACKWARD_NOT_ALLOWED", { fromStatus, toStatus });
            }
            await tx.mixedContainerDetails.update({
                where: { workspaceId },
                data: { organizationStatus: toStatus },
            });
            await recordOrganizationStatusHistory(tx, {
                workspaceId,
                fromStatus,
                toStatus,
                actorUserId: actor.id,
                note: input.note ?? null,
            });
            await appendTimeline(tx, workspaceId, "mixed_container.organization_status_updated", actor.id, {
                fromStatus,
                toStatus,
                note: input.note,
            });
            await notifyBuyerOrganizationEvent(tx, {
                workspaceId,
                buyerUserId: ws.createdById,
                organizationRef: ws.mixedContainerDetails.organizationRef,
                status: toStatus,
            });
        });
        return this.getOrganization(workspaceId, actor, true);
    }
    async assignOperationsManager(workspaceId, managerId, actor) {
        await assertCanManageOrganization(this.prisma, actor, workspaceId);
        const manager = await this.prisma.user.findUniqueOrThrow({
            where: { id: managerId },
            select: { displayName: true },
        });
        await this.prisma.$transaction(async (tx) => {
            await tx.mixedContainerDetails.update({
                where: { workspaceId },
                data: { assignedOperationsManagerId: managerId },
            });
            await appendTimeline(tx, workspaceId, "mixed_container.organization_manager_assigned", actor.id, {
                managerId,
                managerName: manager.displayName,
            });
        });
        return this.getOrganization(workspaceId, actor, true);
    }
}
//# sourceMappingURL=mixed-container-organization.service.js.map