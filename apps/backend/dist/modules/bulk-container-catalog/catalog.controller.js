import { BulkCatalogListQuery } from "@dmx/contracts/bulk-container-catalog";
import { AdminBulkCategoryInput, AdminBulkProductInput, AdminBulkSpecTemplateInput, } from "@dmx/contracts/bulk-container.zod";
import { BulkCatalogService } from "./catalog.service.js";
import { prisma } from "../../db/prisma.js";
const service = new BulkCatalogService(prisma);
export const bulkCatalogController = {
    listCategories: async (_req, res) => {
        res.json({ items: await service.listCategories() });
    },
    listProducts: async (req, res) => {
        const query = BulkCatalogListQuery.parse(req.query);
        res.json(await service.listProducts(query));
    },
    getProduct: async (req, res) => {
        res.json(await service.getProduct(req.params.id));
    },
    adminListCategories: async (_req, res) => {
        res.json({ items: await service.adminListCategories() });
    },
    adminUpsertCategory: async (req, res) => {
        const input = AdminBulkCategoryInput.parse(req.body);
        const id = req.params.id;
        res.json(await service.adminUpsertCategory(input, id));
    },
    adminListProducts: async (_req, res) => {
        res.json({ items: await service.adminListProducts() });
    },
    adminUpsertProduct: async (req, res) => {
        const input = AdminBulkProductInput.parse(req.body);
        const id = req.params.id;
        res.json(await service.adminUpsertProduct(input, id));
    },
    adminListSpecTemplates: async (_req, res) => {
        res.json({ items: await service.adminListSpecTemplates() });
    },
    adminUpsertSpecTemplate: async (req, res) => {
        const input = AdminBulkSpecTemplateInput.parse(req.body);
        const id = req.params.id;
        res.json(await service.adminUpsertSpecTemplate(input, id));
    },
};
//# sourceMappingURL=catalog.controller.js.map