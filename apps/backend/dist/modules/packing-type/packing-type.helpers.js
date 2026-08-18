import { validateBulkContainerPackingAssignment } from "@dmx/contracts/bulk-container-packing-locked";
import { AppError } from "../../utils/httpErrors.js";
function num(v) {
    if (v == null)
        return null;
    return Number(v);
}
export function toPackingTypeDto(pt) {
    return {
        id: pt.id,
        code: pt.code,
        name: pt.name,
        segment: pt.segment,
        unitWeight: num(pt.unitWeight),
        unitWeightUom: pt.unitWeightUom,
        description: pt.description,
        isActive: pt.isActive,
    };
}
export function toPackingTypeSummary(link) {
    return {
        id: link.packingType.id,
        code: link.packingType.code,
        name: link.packingType.name,
        segment: link.packingType.segment,
        unitWeight: num(link.packingType.unitWeight),
        unitWeightUom: link.packingType.unitWeightUom,
        isDefault: link.isDefault,
    };
}
export async function loadProductPackingTypes(prisma, catalogKind, productId) {
    const links = await prisma.productPackingType.findMany({
        where: { catalogKind, productId, isActive: true, packingType: { isActive: true } },
        include: { packingType: true },
        orderBy: [{ isDefault: "desc" }, { packingType: { name: "asc" } }],
    });
    return links.map(toPackingTypeSummary);
}
export async function assertValidPackingTypeForProduct(prisma, catalogKind, productId, packingTypeId) {
    const link = await prisma.productPackingType.findFirst({
        where: {
            catalogKind,
            productId,
            packingTypeId,
            isActive: true,
            packingType: { isActive: true },
        },
        include: { packingType: true },
    });
    if (!link) {
        throw new AppError(400, "PACKING_TYPE_INVALID", { catalogKind, productId, packingTypeId });
    }
    if (catalogKind === "BULK_CONTAINER") {
        const product = await prisma.bulkCatalogProduct.findUnique({
            where: { id: productId },
            include: { category: true },
        });
        if (product) {
            const err = validateBulkContainerPackingAssignment(product.category.slug, link.packingType.code);
            if (err)
                throw new AppError(400, "BC_PACKING_CATALOG_LOCKED", { message: err });
        }
    }
    return link;
}
export async function assertLinesHavePackingType(lines) {
    for (const line of lines) {
        if (!line.packingTypeId)
            throw new AppError(400, "PACKING_TYPE_REQUIRED");
        if (line.packingType && !line.packingType.isActive) {
            throw new AppError(400, "PACKING_TYPE_DEACTIVATED");
        }
    }
}
//# sourceMappingURL=packing-type.helpers.js.map