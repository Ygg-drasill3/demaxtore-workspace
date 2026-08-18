import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import { assertStoredFileExists, streamStoredFileToResponse } from "../../lib/file-storage.js";
import fsp from "node:fs/promises";
export const supplierOrganisationController = {
    getLogo: async (req, res) => {
        const org = await prisma.organisation.findUnique({
            where: { id: req.params.orgId },
            select: { logoStorageKey: true, logoMimeType: true },
        });
        if (!org?.logoStorageKey || !org.logoMimeType)
            throw new AppError(404, "LOGO_NOT_FOUND");
        const path = await assertStoredFileExists(org.logoStorageKey);
        const stat = await fsp.stat(path);
        res.setHeader("Cache-Control", "public, max-age=86400");
        await streamStoredFileToResponse(org.logoStorageKey, res, {
            fileName: "logo",
            mimeType: org.logoMimeType,
            fileSizeBytes: stat.size,
        });
    },
    getCatalog: async (req, res) => {
        const org = await prisma.organisation.findUnique({
            where: { id: req.params.orgId },
            select: { catalogStorageKey: true, catalogMimeType: true, name: true },
        });
        if (!org?.catalogStorageKey || !org.catalogMimeType)
            throw new AppError(404, "CATALOG_NOT_FOUND");
        const path = await assertStoredFileExists(org.catalogStorageKey);
        const stat = await fsp.stat(path);
        res.setHeader("Cache-Control", "private, max-age=3600");
        await streamStoredFileToResponse(org.catalogStorageKey, res, {
            fileName: `${org.name.replace(/[^\w.-]+/g, "_")}-catalog.pdf`,
            mimeType: org.catalogMimeType,
            fileSizeBytes: stat.size,
        });
    },
};
//# sourceMappingURL=supplier-organisation.controller.js.map