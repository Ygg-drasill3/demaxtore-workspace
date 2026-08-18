import { LinkTradeShipmentSchema, UpsertShipmentLineAllocationSchema, } from "@dmx/contracts/trade-lineage";
import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import { TradeLineageService } from "./trade-lineage.service.js";
const lineage = new TradeLineageService(prisma);
function user(req) {
    if (!req.user)
        throw new AppError(401, "UNAUTHENTICATED", { message: "Not authenticated" });
    return req.user;
}
export const tradeLineageController = {
    poRelated: async (req, res) => {
        const dto = await lineage.relatedForPurchaseOrder(user(req), req.params.id);
        res.json(dto);
    },
    shipmentRelated: async (req, res) => {
        const dto = await lineage.relatedForShipment(user(req), req.params.id);
        res.json(dto);
    },
    containerRelated: async (req, res) => {
        const dto = await lineage.relatedForContainer(user(req), req.params.id, req.params.containerId);
        res.json(dto);
    },
    upsertAllocation: async (req, res) => {
        const body = UpsertShipmentLineAllocationSchema.parse(req.body);
        const result = await lineage.upsertAllocation(user(req), body);
        res.status(201).json(result);
    },
    linkShipment: async (req, res) => {
        const body = LinkTradeShipmentSchema.parse(req.body);
        await lineage.linkPoToShipment(user(req), body.purchaseOrderId, body.shipmentWorkspaceId);
        res.status(204).end();
    },
    /** Repair path — allocate remaining PO lines onto an existing shipment. */
    backfillAllocations: async (req, res) => {
        const result = await lineage.backfillRemainingAllocations(user(req), req.params.id);
        res.json(result);
    },
};
//# sourceMappingURL=trade-lineage.controller.js.map