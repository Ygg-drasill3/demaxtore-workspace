import { Prisma, PrismaClient } from "@prisma/client";
import type { CatalogListQuery } from "@dmx/contracts/mixed-container-catalog";
import type {
  AdminCatalogCategoryInput,
  AdminCatalogProductInput,
} from "@dmx/contracts/mixed-container.zod";
import { AppError } from "../../utils/httpErrors.js";
import { writeStoredFile, assertStoredFileExists } from "../../lib/file-storage.js";
import { toPackingTypeSummary } from "../packing-type/packing-type.helpers.js";
import fs from "node:fs";

function num(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  return Number(v);
}

function toProductCard(p: {
  id: string;
  productRef: string;
  name: string;
  packingTypes?: ReturnType<typeof toPackingTypeSummary>[];
  packagingDescription: string;
  moqPallets: number;
  unitsPerPallet: number;
  palletWeightKg: Prisma.Decimal | null;
  sampleAvailable: boolean;
  sampleLeadDays: number | null;
  marketStatus: string;
  indicativeLow: Prisma.Decimal | null;
  indicativeMid: Prisma.Decimal | null;
  indicativeHigh: Prisma.Decimal | null;
  indicativeCurrency: string;
  originCountry: string | null;
  certifications: string[];
  supplierCount: number;
  imageStorageKey: string | null;
  updatedAt: Date;
  category: { name: string; slug: string };
}) {
  return {
    id: p.id,
    productRef: p.productRef,
    name: p.name,
    category: p.category.name,
    categorySlug: p.category.slug,
    packagingDescription: p.packagingDescription,
    moqPallets: p.moqPallets,
    unitsPerPallet: p.unitsPerPallet,
    palletWeightKg: num(p.palletWeightKg),
    sampleAvailable: p.sampleAvailable,
    sampleLeadDays: p.sampleLeadDays,
    marketStatus: p.marketStatus,
    indicativeLow: num(p.indicativeLow),
    indicativeMid: num(p.indicativeMid),
    indicativeHigh: num(p.indicativeHigh),
    indicativeCurrency: p.indicativeCurrency,
    originCountry: p.originCountry,
    certifications: p.certifications,
    supplierAvailabilityLabel: `Available from ${p.supplierCount} verified suppliers`,
    packingTypes: p.packingTypes ?? [],
    imageUrl: p.imageStorageKey ? `/api/mixed-container/catalog/products/${p.id}/image` : null,
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function loadMcPackingMap(prisma: PrismaClient, productIds: string[]) {
  if (!productIds.length) return new Map<string, ReturnType<typeof toPackingTypeSummary>[]>();
  const links = await prisma.productPackingType.findMany({
    where: {
      catalogKind: "MIXED_CONTAINER",
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

export class CatalogService {
  constructor(public readonly prisma: PrismaClient) {}

  async listCategories() {
    const cats = await this.prisma.catalogCategory.findMany({
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

  async listProducts(query: CatalogListQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 24, 100);
    const where: Prisma.CatalogProductWhereInput = { status: "ACTIVE" };
    if (query.category) {
      where.category = { slug: query.category };
    }
    if (query.sampleAvailable) where.sampleAvailable = true;
    if (query.marketStatus) where.marketStatus = query.marketStatus;
    if (query.originCountry) where.originCountry = query.originCountry;
    if (query.certification) {
      where.certifications = { has: query.certification };
    }
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { productRef: { contains: query.q, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.catalogProduct.findMany({
        where,
        include: { category: true },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.catalogProduct.count({ where }),
    ]);
    const packingMap = await loadMcPackingMap(this.prisma, items.map((p) => p.id));
    return {
      items: items.map((p) => toProductCard({ ...p, packingTypes: packingMap.get(p.id) ?? [] })),
      total,
      page,
      limit,
    };
  }

  async getProduct(id: string) {
    const p = await this.prisma.catalogProduct.findFirst({
      where: { id, status: "ACTIVE" },
      include: { category: true },
    });
    if (!p) throw new AppError(404, "PRODUCT_NOT_FOUND");
    const packingMap = await loadMcPackingMap(this.prisma, [p.id]);
    return {
      ...toProductCard({ ...p, packingTypes: packingMap.get(p.id) ?? [] }),
      marketInsightSummary: p.marketInsightSummary,
    };
  }

  async getProductImage(id: string): Promise<{ path: string; mime: string }> {
    const p = await this.prisma.catalogProduct.findFirst({
      where: { id, status: "ACTIVE" },
      select: { imageStorageKey: true, imageMimeType: true },
    });
    if (!p?.imageStorageKey || !p.imageMimeType) throw new AppError(404, "IMAGE_NOT_FOUND");
    const path = await assertStoredFileExists(p.imageStorageKey);
    return { path, mime: p.imageMimeType };
  }

  // ── Admin ──

  async adminListCategories() {
    return this.prisma.catalogCategory.findMany({ orderBy: { sortOrder: "asc" } });
  }

  async adminCreateCategory(input: AdminCatalogCategoryInput) {
    return this.prisma.catalogCategory.create({ data: input });
  }

  async adminUpdateCategory(id: string, input: Partial<AdminCatalogCategoryInput>) {
    return this.prisma.catalogCategory.update({ where: { id }, data: input });
  }

  async adminListProducts() {
    const items = await this.prisma.catalogProduct.findMany({
      include: { category: true },
      orderBy: { updatedAt: "desc" },
    });
    const packingMap = await loadMcPackingMap(this.prisma, items.map((p) => p.id));
    return items.map((p) => ({
      ...toProductCard({ ...p, packingTypes: packingMap.get(p.id) ?? [] }),
      status: p.status,
      marketInsightSummary: p.marketInsightSummary,
    }));
  }

  async adminCreateProduct(input: AdminCatalogProductInput) {
    return this.prisma.catalogProduct.create({ data: input });
  }

  async adminUpdateProduct(id: string, input: Partial<AdminCatalogProductInput> & { status?: string }) {
    return this.prisma.catalogProduct.update({ where: { id }, data: input });
  }

  async adminUploadImage(id: string, buffer: Buffer, mime: string, originalName?: string) {
    const allowed = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowed.has(mime)) throw new AppError(400, "INVALID_IMAGE_TYPE");
    const { storageKey } = await writeStoredFile(buffer, originalName);
    await this.prisma.catalogProduct.update({
      where: { id },
      data: { imageStorageKey: storageKey, imageMimeType: mime },
    });
    return { imageUrl: `/api/mixed-container/catalog/products/${id}/image` };
  }

  async streamImage(path: string, res: import("express").Response) {
    res.setHeader("Content-Type", "image/jpeg");
    fs.createReadStream(path).pipe(res);
  }
}
