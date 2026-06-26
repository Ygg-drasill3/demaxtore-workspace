import { Prisma, PrismaClient } from "@prisma/client";
import type { BulkCatalogListQuery } from "@dmx/contracts/bulk-container-catalog";
import type {
  AdminBulkCategoryInput,
  AdminBulkProductInput,
  AdminBulkSpecTemplateInput,
} from "@dmx/contracts/bulk-container.zod";
import type { BulkSpecTemplate } from "@dmx/contracts/bulk-container-catalog";
import { AppError } from "../../utils/httpErrors.js";
import { toPackingTypeSummary } from "../packing-type/packing-type.helpers.js";

function num(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  return Number(v);
}

function toProductCard(p: {
  id: string;
  productRef: string;
  name: string;
  packingTypes?: ReturnType<typeof toPackingTypeSummary>[];
  standardPacking: string;
  marketStatus: string;
  indicativeLow: Prisma.Decimal | null;
  indicativeHigh: Prisma.Decimal | null;
  indicativeCurrency: string;
  minOrderMt: Prisma.Decimal;
  updatedAt: Date;
  category: { name: string; slug: string };
  specTemplate: { id: string; productType: string; name: string; schema: unknown };
}) {
  return {
    id: p.id,
    productRef: p.productRef,
    name: p.name,
    category: p.category.name,
    categorySlug: p.category.slug,
    standardPacking: p.standardPacking,
    marketStatus: p.marketStatus,
    indicativeLow: num(p.indicativeLow),
    indicativeHigh: num(p.indicativeHigh),
    indicativeCurrency: p.indicativeCurrency,
    indicativeRangeLabel:
      p.indicativeLow != null && p.indicativeHigh != null
        ? `$${num(p.indicativeLow)}–$${num(p.indicativeHigh)} / MT`
        : null,
    minOrderMt: Number(p.minOrderMt),
    specTemplate: {
      id: p.specTemplate.id,
      productType: p.specTemplate.productType,
      name: p.specTemplate.name,
      schema: p.specTemplate.schema as BulkSpecTemplate,
    },
    packingTypes: p.packingTypes ?? [],
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function loadBcPackingMap(prisma: PrismaClient, productIds: string[]) {
  if (!productIds.length) return new Map<string, ReturnType<typeof toPackingTypeSummary>[]>();
  const links = await prisma.productPackingType.findMany({
    where: {
      catalogKind: "BULK_CONTAINER",
      productId: { in: productIds },
      isActive: true,
      packingType: { isActive: true },
    },
    include: { packingType: true },
    orderBy: [{ isDefault: "desc" }, { packingType: { name: "asc" } }],
  });
  const map = new Map<string, ReturnType<typeof toPackingTypeSummary>[]>();
  for (const link of links) {
    const arr = map.get(link.productId) ?? [];
    arr.push(toPackingTypeSummary(link));
    map.set(link.productId, arr);
  }
  return map;
}

export class BulkCatalogService {
  constructor(public readonly prisma: PrismaClient) {}

  async listCategories() {
    const cats = await this.prisma.bulkCatalogCategory.findMany({
      where: { status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
    });
    return cats.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      productCount: c._count.products,
    }));
  }

  async listProducts(query: BulkCatalogListQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 24, 100);
    const where: Prisma.BulkCatalogProductWhereInput = { status: "ACTIVE" };
    if (query.category) where.category = { slug: query.category };
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { productRef: { contains: query.q, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.bulkCatalogProduct.findMany({
        where,
        include: { category: true, specTemplate: true },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bulkCatalogProduct.count({ where }),
    ]);
    const packingMap = await loadBcPackingMap(this.prisma, items.map((p) => p.id));
    return {
      items: items.map((p) => toProductCard({ ...p, packingTypes: packingMap.get(p.id) ?? [] })),
      total,
      page,
      limit,
    };
  }

  async getProduct(id: string) {
    const p = await this.prisma.bulkCatalogProduct.findFirst({
      where: { id, status: "ACTIVE" },
      include: { category: true, specTemplate: true },
    });
    if (!p) throw new AppError(404, "PRODUCT_NOT_FOUND");
    const packingMap = await loadBcPackingMap(this.prisma, [p.id]);
    return toProductCard({ ...p, packingTypes: packingMap.get(p.id) ?? [] });
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  async adminListCategories() {
    return this.prisma.bulkCatalogCategory.findMany({ orderBy: { sortOrder: "asc" } });
  }

  async adminUpsertCategory(input: AdminBulkCategoryInput, id?: string) {
    if (id) {
      return this.prisma.bulkCatalogCategory.update({ where: { id }, data: input });
    }
    return this.prisma.bulkCatalogCategory.create({ data: input });
  }

  async adminListProducts() {
    return this.prisma.bulkCatalogProduct.findMany({
      include: { category: true, specTemplate: true },
      orderBy: { productRef: "asc" },
    });
  }

  async adminUpsertProduct(input: AdminBulkProductInput, id?: string) {
    const data = {
      ...input,
      indicativeLow: input.indicativeLow ?? null,
      indicativeHigh: input.indicativeHigh ?? null,
    };
    if (id) return this.prisma.bulkCatalogProduct.update({ where: { id }, data });
    return this.prisma.bulkCatalogProduct.create({ data });
  }

  async adminListSpecTemplates() {
    return this.prisma.bulkSpecTemplate.findMany({ orderBy: { productType: "asc" } });
  }

  async adminUpsertSpecTemplate(input: AdminBulkSpecTemplateInput, id?: string) {
    const data = {
      productType: input.productType,
      name: input.name,
      schema: input.schema as Prisma.InputJsonValue,
      isActive: input.isActive,
    };
    if (id) return this.prisma.bulkSpecTemplate.update({ where: { id }, data });
    return this.prisma.bulkSpecTemplate.create({ data });
  }
}
