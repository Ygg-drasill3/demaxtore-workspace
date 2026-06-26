import type { Prisma, PrismaClient } from "@prisma/client";
import { validateBulkContainerPackingAssignment } from "@dmx/contracts/bulk-container-packing-locked";
import type { CatalogKind } from "@dmx/contracts/packing-type";
import { AppError } from "../../utils/httpErrors.js";

function num(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  return Number(v);
}

export function toPackingTypeDto(pt: {
  id: string;
  code: string;
  name: string;
  segment: string;
  unitWeight: Prisma.Decimal | null;
  unitWeightUom: string | null;
  description: string | null;
  isActive: boolean;
}) {
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

export function toPackingTypeSummary(link: {
  isDefault: boolean;
  packingType: {
    id: string;
    code: string;
    name: string;
    segment: string;
    unitWeight: Prisma.Decimal | null;
    unitWeightUom: string | null;
  };
}) {
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

export async function loadProductPackingTypes(
  prisma: PrismaClient,
  catalogKind: CatalogKind,
  productId: string,
) {
  const links = await prisma.productPackingType.findMany({
    where: { catalogKind, productId, isActive: true, packingType: { isActive: true } },
    include: { packingType: true },
    orderBy: [{ isDefault: "desc" }, { packingType: { name: "asc" } }],
  });
  return links.map(toPackingTypeSummary);
}

export async function assertValidPackingTypeForProduct(
  prisma: PrismaClient,
  catalogKind: CatalogKind,
  productId: string,
  packingTypeId: string,
) {
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
      if (err) throw new AppError(400, "BC_PACKING_CATALOG_LOCKED", { message: err });
    }
  }
  return link;
}

export async function assertLinesHavePackingType(
  lines: Array<{ packingTypeId: string | null; packingType?: { isActive: boolean } | null }>,
) {
  for (const line of lines) {
    if (!line.packingTypeId) throw new AppError(400, "PACKING_TYPE_REQUIRED");
    if (line.packingType && !line.packingType.isActive) {
      throw new AppError(400, "PACKING_TYPE_DEACTIVATED");
    }
  }
}
