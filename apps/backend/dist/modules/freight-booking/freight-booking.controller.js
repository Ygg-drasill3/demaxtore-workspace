import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import { CreateFreightBookingPayload, ListFreightBookingsQuery, SelectCarrierOptionPayload, } from "@dmx/contracts/freight-booking.zod";
import { FreightBookingEngineService } from "./freight-booking.service.js";
const service = new FreightBookingEngineService(prisma);
export const freightBookingController = {
    list: async (req, res) => {
        const query = ListFreightBookingsQuery.parse(req.query);
        res.json(await service.list(req.user, query));
    },
    get: async (req, res) => {
        res.json(await service.getById(req.user, req.params.id));
    },
    panel: async (req, res) => {
        const tradeId = String(req.query.tradeId ?? "");
        if (!tradeId)
            throw new AppError(400, "TRADE_ID_REQUIRED");
        res.json(await service.getPanel(req.user, tradeId));
    },
    create: async (req, res) => {
        const payload = CreateFreightBookingPayload.parse(req.body);
        res.status(201).json(await service.create(req.user, payload));
    },
    select: async (req, res) => {
        const payload = SelectCarrierOptionPayload.parse(req.body);
        res.json(await service.selectCarrier(req.user, req.params.id, payload));
    },
    confirm: async (req, res) => {
        res.json(await service.confirm(req.user, req.params.id));
    },
    kpi: async (_req, res) => {
        res.json(await service.countKpis());
    },
};
//# sourceMappingURL=freight-booking.controller.js.map