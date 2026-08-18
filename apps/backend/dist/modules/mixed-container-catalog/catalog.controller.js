import multer from "multer";
import fs from "node:fs";
import { AdminCatalogCategoryInput, AdminCatalogProductInput, } from "@dmx/contracts/mixed-container.zod";
import { CatalogService } from "./catalog.service.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../utils/httpErrors.js";
const service = new CatalogService(prisma);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const catalogController = {
    listIndustries: async (_req, res) => {
        res.json({ items: await service.listIndustries() });
    },
    listCategories: async (req, res) => {
        const industry = req.query.industry;
        res.json({ items: await service.listCategories(industry) });
    },
    listProducts: async (req, res) => {
        const query = {
            industry: req.query.industry,
            category: req.query.category,
            sampleAvailable: req.query.sampleAvailable === "true",
            certification: req.query.certification,
            marketStatus: req.query.marketStatus,
            originCountry: req.query.originCountry,
            q: req.query.q,
            page: req.query.page ? Number(req.query.page) : 1,
            limit: req.query.limit ? Number(req.query.limit) : 24,
        };
        res.json(await service.listProducts(query));
    },
    getProduct: async (req, res) => {
        res.json(await service.getProduct(req.params.id));
    },
    getProductByRef: async (req, res) => {
        res.json(await service.getProductByRef(req.params.productRef));
    },
    getProductImage: async (req, res) => {
        const { path: filePath, mime } = await service.getProductImage(req.params.id);
        res.setHeader("Content-Type", mime);
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
        fs.createReadStream(filePath).pipe(res);
    },
    getCategoryImage: async (req, res) => {
        const { path: filePath, mime } = await service.getCategoryImage(req.params.id);
        res.setHeader("Content-Type", mime);
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
        fs.createReadStream(filePath).pipe(res);
    },
    adminListCategories: async (_req, res) => {
        res.json({ items: await service.adminListCategories() });
    },
    adminCreateCategory: async (req, res) => {
        const input = AdminCatalogCategoryInput.parse(req.body);
        res.status(201).json(await service.adminCreateCategory(input));
    },
    adminUpdateCategory: async (req, res) => {
        const input = AdminCatalogCategoryInput.partial().parse(req.body);
        res.json(await service.adminUpdateCategory(req.params.id, input));
    },
    adminListProducts: async (_req, res) => {
        res.json({ items: await service.adminListProducts() });
    },
    adminCreateProduct: async (req, res) => {
        const input = AdminCatalogProductInput.parse(req.body);
        res.status(201).json(await service.adminCreateProduct(input));
    },
    adminUpdateProduct: async (req, res) => {
        const body = req.body;
        res.json(await service.adminUpdateProduct(req.params.id, body));
    },
    adminUploadImage: [
        upload.single("file"),
        async (req, res) => {
            if (!req.file)
                throw new AppError(400, "FILE_REQUIRED");
            const result = await service.adminUploadImage(req.params.id, req.file.buffer, req.file.mimetype, req.file.originalname);
            res.json(result);
        },
    ],
};
//# sourceMappingURL=catalog.controller.js.map