import { CreateProductSchema, ProductListQuerySchema, UpdateProductSchema, UpsertProductSupplierReferenceSchema, } from "@dmx/contracts/product-master";
import { prisma } from "../../db/prisma.js";
import { createProductMasterService } from "./product-master.service.js";
function user(req) {
    return req.user;
}
const svc = createProductMasterService(prisma);
export const productMasterController = {
    async list(req, res) {
        const query = ProductListQuerySchema.parse(req.query);
        res.json(await svc.list(user(req), query));
    },
    async get(req, res) {
        res.json(await svc.get(user(req), req.params.id));
    },
    async create(req, res) {
        const body = CreateProductSchema.parse(req.body ?? {});
        res.status(201).json(await svc.create(user(req), body));
    },
    async update(req, res) {
        const body = UpdateProductSchema.parse(req.body ?? {});
        res.json(await svc.update(user(req), req.params.id, body));
    },
    async upsertSupplierRef(req, res) {
        const body = UpsertProductSupplierReferenceSchema.parse(req.body ?? {});
        res.json(await svc.upsertSupplierReference(user(req), req.params.id, body));
    },
    async relatedPos(req, res) {
        const page = Number(req.query.page ?? 1) || 1;
        const pageSize = Math.min(100, Number(req.query.pageSize ?? 25) || 25);
        res.json(await svc.relatedPurchaseOrders(user(req), req.params.id, page, pageSize));
    },
    async relatedShipments(req, res) {
        const page = Number(req.query.page ?? 1) || 1;
        const pageSize = Math.min(100, Number(req.query.pageSize ?? 25) || 25);
        res.json(await svc.relatedShipments(user(req), req.params.id, page, pageSize));
    },
};
//# sourceMappingURL=product-master.controller.js.map