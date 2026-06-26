import type { PrismaClient } from "@prisma/client";
import {
  BULK_CONTAINER_CATEGORY_DEFAULT_PACKING,
  BULK_CONTAINER_LOCKED_PACKING_TYPES,
  isBulkContainerPackingPrefix,
  isLockedBulkContainerPackingCode,
  lockedPackingCodesForCategory,
  validateBulkContainerPackingAssignment,
} from "@dmx/contracts/bulk-container-packing-locked";
import type {
  AdminPackingTypeInput,
  AssignPackingTypeInput,
  CatalogKind,
  UpdateProductPackingTypeInput,
} from "@dmx/contracts/packing-type";
import { AppError } from "../../utils/httpErrors.js";
import { toPackingTypeDto } from "./packing-type.helpers.js";

export class PackingTypeService {
  constructor(public readonly prisma: PrismaClient) {}

  async list(activeOnly = true) {
    const rows = await this.prisma.packingType.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ segment: "asc" }, { name: "asc" }],
    });
    return { items: rows.map(toPackingTypeDto) };
  }

  async adminList() {
    const rows = await this.prisma.packingType.findMany({
      orderBy: [{ segment: "asc" }, { code: "asc" }],
    });
    return { items: rows.map(toPackingTypeDto) };
  }

  async create(input: AdminPackingTypeInput) {
    if (isBulkContainerPackingPrefix(input.code) && !isLockedBulkContainerPackingCode(input.code)) {
      throw new AppError(400, "BC_PACKING_CATALOG_LOCKED", {
        message: "BulkContainer packing types are locked. Create SmartContainer (PT-MC-*) types only.",
      });
    }
    const existing = await this.prisma.packingType.findUnique({ where: { code: input.code } });
    if (existing) throw new AppError(409, "PACKING_TYPE_CODE_EXISTS");
    const row = await this.prisma.packingType.create({
      data: {
        code: input.code,
        name: input.name,
        segment: input.segment,
        unitWeight: input.unitWeight ?? null,
        unitWeightUom: input.unitWeightUom ?? null,
        description: input.description ?? null,
        isActive: input.isActive,
      },
    });
    return toPackingTypeDto(row);
  }

  async update(id: string, input: Partial<AdminPackingTypeInput>) {
    const current = await this.prisma.packingType.findUniqueOrThrow({ where: { id } });
    if (isLockedBulkContainerPackingCode(current.code)) {
      if (input.isActive === false) {
        throw new AppError(400, "BC_PACKING_CATALOG_LOCKED", { code: current.code });
      }
      const immutableChange =
        (input.name !== undefined && input.name !== current.name) ||
        (input.segment !== undefined && input.segment !== current.segment) ||
        (input.unitWeight !== undefined && Number(input.unitWeight) !== Number(current.unitWeight)) ||
        (input.unitWeightUom !== undefined && input.unitWeightUom !== current.unitWeightUom);
      if (immutableChange) {
        throw new AppError(400, "BC_PACKING_CATALOG_LOCKED", { code: current.code });
      }
    }
    const row = await this.prisma.packingType.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.segment !== undefined ? { segment: input.segment } : {}),
        ...(input.unitWeight !== undefined ? { unitWeight: input.unitWeight } : {}),
        ...(input.unitWeightUom !== undefined ? { unitWeightUom: input.unitWeightUom } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    return toPackingTypeDto(row);
  }

  async assignProduct(input: AssignPackingTypeInput) {
    const product = await this.assertProductExists(input.catalogKind, input.productId);
    const pt = await this.prisma.packingType.findUnique({ where: { id: input.packingTypeId } });
    if (!pt) throw new AppError(404, "PACKING_TYPE_NOT_FOUND");

    if (input.catalogKind === "BULK_CONTAINER") {
      const err = validateBulkContainerPackingAssignment(product.categorySlug, pt.code);
      if (err) throw new AppError(400, "BC_PACKING_CATALOG_LOCKED", { message: err });
    }

    if (input.isDefault) {
      await this.prisma.productPackingType.updateMany({
        where: { catalogKind: input.catalogKind, productId: input.productId },
        data: { isDefault: false },
      });
    }

    const link = await this.prisma.productPackingType.upsert({
      where: {
        catalogKind_productId_packingTypeId: {
          catalogKind: input.catalogKind,
          productId: input.productId,
          packingTypeId: input.packingTypeId,
        },
      },
      create: {
        catalogKind: input.catalogKind,
        productId: input.productId,
        packingTypeId: input.packingTypeId,
        isDefault: input.isDefault,
        isActive: input.isActive,
      },
      update: {
        isDefault: input.isDefault,
        isActive: input.isActive,
      },
      include: { packingType: true },
    });

    return {
      id: link.id,
      catalogKind: link.catalogKind,
      productId: link.productId,
      packingTypeId: link.packingTypeId,
      packingType: toPackingTypeDto(link.packingType),
      isDefault: link.isDefault,
      isActive: link.isActive,
    };
  }

  async updateProductLink(linkId: string, input: UpdateProductPackingTypeInput) {
    const existing = await this.prisma.productPackingType.findUniqueOrThrow({
      where: { id: linkId },
      include: { packingType: true },
    });
    if (existing.catalogKind === "BULK_CONTAINER" && input.isActive === false) {
      if (isLockedBulkContainerPackingCode(existing.packingType.code)) {
        throw new AppError(400, "BC_PACKING_CATALOG_LOCKED", { code: existing.packingType.code });
      }
    }
    if (input.isDefault) {
      await this.prisma.productPackingType.updateMany({
        where: { catalogKind: existing.catalogKind, productId: existing.productId },
        data: { isDefault: false },
      });
    }
    const link = await this.prisma.productPackingType.update({
      where: { id: linkId },
      data: {
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: { packingType: true },
    });
    return {
      id: link.id,
      catalogKind: link.catalogKind,
      productId: link.productId,
      packingTypeId: link.packingTypeId,
      packingType: toPackingTypeDto(link.packingType),
      isDefault: link.isDefault,
      isActive: link.isActive,
    };
  }

  async listProductLinks(catalogKind: CatalogKind, productId: string) {
    const links = await this.prisma.productPackingType.findMany({
      where: { catalogKind, productId },
      include: { packingType: true },
      orderBy: [{ isDefault: "desc" }, { packingType: { name: "asc" } }],
    });
    return {
      items: links.map((l) => ({
        id: l.id,
        catalogKind: l.catalogKind,
        productId: l.productId,
        packingTypeId: l.packingTypeId,
        packingType: toPackingTypeDto(l.packingType),
        isDefault: l.isDefault,
        isActive: l.isActive,
      })),
    };
  }

  private async assertProductExists(catalogKind: CatalogKind, productId: string) {
    if (catalogKind === "MIXED_CONTAINER") {
      const p = await this.prisma.catalogProduct.findUnique({
        where: { id: productId },
        include: { category: true },
      });
      if (!p) throw new AppError(404, "PRODUCT_NOT_FOUND");
      return { categorySlug: p.category.slug };
    }
    const p = await this.prisma.bulkCatalogProduct.findUnique({
      where: { id: productId },
      include: { category: true },
    });
    if (!p) throw new AppError(404, "PRODUCT_NOT_FOUND");
    return { categorySlug: p.category.slug };
  }

  /** Re-sync BC product assignments to locked catalog (seed / maintenance). */
  async enforceBulkContainerLockedCatalog() {
    const products = await this.prisma.bulkCatalogProduct.findMany({
      where: { status: "ACTIVE" },
      include: { category: true },
    });
    const ptMap = new Map(
      (await this.prisma.packingType.findMany({
        where: { code: { in: [...BULK_CONTAINER_LOCKED_PACKING_TYPES.map((p) => p.code)] } },
      })).map((p) => [p.code, p.id]),
    );

    for (const product of products) {
      const slug = product.category.slug;
      const codes = lockedPackingCodesForCategory(slug);
      const defaultCode = BULK_CONTAINER_CATEGORY_DEFAULT_PACKING[slug as keyof typeof BULK_CONTAINER_CATEGORY_DEFAULT_PACKING];
      if (!codes.length || !defaultCode) continue;

      for (const code of codes) {
        const packingTypeId = ptMap.get(code);
        if (!packingTypeId) continue;
        await this.prisma.productPackingType.upsert({
          where: {
            catalogKind_productId_packingTypeId: {
              catalogKind: "BULK_CONTAINER",
              productId: product.id,
              packingTypeId,
            },
          },
          update: { isActive: true, isDefault: code === defaultCode },
          create: {
            catalogKind: "BULK_CONTAINER",
            productId: product.id,
            packingTypeId,
            isActive: true,
            isDefault: code === defaultCode,
          },
        });
      }

      const allowedIds = codes.map((c) => ptMap.get(c)).filter(Boolean) as string[];
      await this.prisma.productPackingType.updateMany({
        where: {
          catalogKind: "BULK_CONTAINER",
          productId: product.id,
          packingTypeId: { notIn: allowedIds },
        },
        data: { isActive: false, isDefault: false },
      });
    }
  }
}
