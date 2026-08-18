import { AdminPackingTypeInput, AssignPackingTypeInput, UpdateProductPackingTypeInput, } from "@dmx/contracts/packing-type";
import { prisma } from "../../db/prisma.js";
import { PackingTypeService } from "./packing-type.service.js";
const service = new PackingTypeService(prisma);
export const packingTypeController = {
    list: async (_req, res) => {
        res.json(await service.list(true));
    },
    adminList: async (_req, res) => {
        res.json(await service.adminList());
    },
    create: async (req, res) => {
        const input = AdminPackingTypeInput.parse(req.body);
        res.status(201).json(await service.create(input));
    },
    update: async (req, res) => {
        const input = AdminPackingTypeInput.partial().parse(req.body);
        res.json(await service.update(req.params.id, input));
    },
    assignProduct: async (req, res) => {
        const input = AssignPackingTypeInput.parse(req.body);
        res.status(201).json(await service.assignProduct(input));
    },
    updateProductLink: async (req, res) => {
        const input = UpdateProductPackingTypeInput.parse(req.body);
        res.json(await service.updateProductLink(req.params.linkId, input));
    },
    listProductLinks: async (req, res) => {
        const catalogKind = req.query.catalogKind;
        const productId = req.query.productId;
        res.json(await service.listProductLinks(catalogKind, productId));
    },
};
//# sourceMappingURL=packing-type.controller.js.map