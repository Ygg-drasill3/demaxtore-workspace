import { z } from "zod";
import { SupplierConfirmOrderPayload, StartProductionPayload, ReportProductionProgressPayload, RequestInspectionPayload, SkipInspectionPayload, RecordInspectionResultPayload, ProceedToFreightPayload, BookShipmentPayload, MarkDepartedPayload, UpdateEtaPayload, MarkArrivedPayload, MarkDeliveredPayload, MarkPartiallyDeliveredPayload, RejectOrderPayload, CloseOrderPayload, OpenDisputePayload, ResolveDisputePayload, CancelOrderPayload, UploadOrderDocumentPayload, ListOrderQuery, } from "@dmx/contracts/order.zod";
import { computeOrderNextActions } from "@dmx/contracts/order.next-actions";
import { isFreightOfferSelected } from "@dmx/contracts/order.freight-coordination";
import { OrderService } from "./order.service.js";
import { TradeActionGateway } from "../orchestration/trade-action.gateway.js";
import { canAccessOrder } from "./order.policy.js";
import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
const service = new OrderService(prisma);
const tradeGateway = new TradeActionGateway(prisma);
const ActionEnvelope = z.object({ payload: z.record(z.unknown()).optional(), reason: z.string().optional() });
const PAYLOAD_SCHEMAS = {
    supplier_confirm_order: SupplierConfirmOrderPayload,
    start_production: StartProductionPayload,
    report_production_progress: ReportProductionProgressPayload,
    request_inspection: RequestInspectionPayload,
    skip_inspection: SkipInspectionPayload,
    record_inspection_result: RecordInspectionResultPayload,
    proceed_to_freight: ProceedToFreightPayload,
    book_shipment: BookShipmentPayload,
    mark_departed: MarkDepartedPayload,
    update_eta: UpdateEtaPayload,
    mark_arrived: MarkArrivedPayload,
    mark_partially_delivered: MarkPartiallyDeliveredPayload,
    mark_delivered: MarkDeliveredPayload,
    reject_order: RejectOrderPayload,
    close_order: CloseOrderPayload,
    open_dispute: OpenDisputePayload,
    resolve_dispute_close: ResolveDisputePayload,
    resolve_dispute_cancel: ResolveDisputePayload,
    cancel_order: CancelOrderPayload,
    upload_document: UploadOrderDocumentPayload,
};
async function loadAccessible(req) {
    const ws = await prisma.workspace.findUnique({
        where: { id: req.params.id },
        include: { orderWorkspace: true, participants: true },
    });
    if (!ws || ws.type !== "ORDER")
        throw new AppError(404, "ORDER_NOT_FOUND");
    if (!(await canAccessOrder(prisma, req.user, ws.id)))
        throw new AppError(403, "FORBIDDEN");
    return ws;
}
function buildContext(ws, user, productionPercent = 0, freightOfferSelected = true) {
    return {
        state: ws.state,
        actorRole: user.role,
        isOwner: ws.participants.some((p) => p.userId === user.id && p.participantRole === "OWNER"),
        isCounterparty: ws.participants.some((p) => p.userId === user.id && p.participantRole === "COUNTERPARTY"),
        inspectionResult: ws.orderWorkspace?.inspectionResult,
        productionPercent,
        freightOfferSelected,
    };
}
async function latestProductionPercent(workspaceId) {
    const latest = await prisma.orderStatusUpdate.findFirst({
        where: { workspaceId, updateType: "PRODUCTION" },
        orderBy: { createdAt: "desc" },
        select: { percentage: true },
    });
    return latest?.percentage ?? 0;
}
export const orderController = {
    async list(req, res) {
        const q = ListOrderQuery.parse(req.query);
        res.json(await service.list(q, req.user));
    },
    async get(req, res) {
        await loadAccessible(req);
        res.json(await service.fetchDTO(req.params.id, req.user));
    },
    async timeline(req, res) {
        await loadAccessible(req);
        res.json(await service.timeline(req.params.id));
    },
    async documents(req, res) {
        await loadAccessible(req);
        res.json(await service.listDocuments(req.params.id));
    },
    async statusUpdates(req, res) {
        await loadAccessible(req);
        res.json(await service.statusUpdates(req.params.id));
    },
    async nextActions(req, res) {
        const ws = await loadAccessible(req);
        const [productionPercent, freightRequests] = await Promise.all([
            latestProductionPercent(ws.id),
            prisma.freightRequest.findMany({
                where: { orderId: ws.id },
                include: { selection: true },
                orderBy: { createdAt: "desc" },
            }),
        ]);
        res.json(computeOrderNextActions(buildContext(ws, req.user, productionPercent, isFreightOfferSelected(freightRequests))));
    },
    async spawnedShipments(req, res) {
        const ws = await loadAccessible(req);
        const children = await prisma.workspace.findMany({
            where: { spawnedFromId: ws.id, type: "SHIPMENT" },
            select: { id: true, externalRef: true, state: true, createdAt: true },
            orderBy: { createdAt: "asc" },
        });
        res.json(children);
    },
    action(action) {
        return async (req, res) => {
            const ws = await loadAccessible(req);
            const { isOrchestratorAutoApply } = await import("../../config/orchestrator.js");
            const logisticsActions = ["book_shipment", "mark_departed", "mark_arrived", "mark_delivered"];
            if (isOrchestratorAutoApply() && logisticsActions.includes(action)) {
                throw new AppError(409, "ORCHESTRATOR_ONLY", {
                    message: "Order logistics milestones are driven by the shipment workspace",
                });
            }
            const env = ActionEnvelope.parse(req.body);
            const schema = PAYLOAD_SCHEMAS[action];
            const payload = schema
                ? schema.parse(env.payload ?? req.body?.payload ?? req.body ?? {})
                : (env.payload ?? {});
            const result = await tradeGateway.applyOrderAction({
                workspaceId: ws.id,
                action,
                actor: { id: req.user.id, email: req.user.email, role: req.user.role },
                payload: payload,
                reason: env.reason,
                idempotencyKey: req.headers["idempotency-key"],
                requestContext: { ip: req.ip, userAgent: req.headers["user-agent"] },
            });
            res.json({ ok: true, ...result, workspace: await service.fetchDTO(ws.id, req.user) });
        };
    },
};
//# sourceMappingURL=order.controller.js.map