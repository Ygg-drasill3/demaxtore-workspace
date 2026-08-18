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

function toPackagingOption(pkg: {
  id: string;
  slug: string;
  name: string;
  unitsPerPallet: number;
  moqPallets: number;
  isDefault: boolean;
  packingTypeId: string | null;
}) {
  return {
    id: pkg.id,
    slug: pkg.slug,
    name: pkg.name,
    unitsPerPallet: pkg.unitsPerPallet,
    moqPallets: pkg.moqPallets,
    isDefault: pkg.isDefault,
    packingTypeId: pkg.packingTypeId,
  };
}

function productImageUrl(id: string, imageStorageKey: string | null): string | null {
  if (!imageStorageKey) return null;
  const v = encodeURIComponent(imageStorageKey.replace(/\.[^.]+$/, "").slice(0, 12));
  return `/api/mixed-container/catalog/products/${id}/image?v=${v}`;
}

function categoryImageUrl(id: string, imageStorageKey: string | null): string | null {
  if (!imageStorageKey) return null;
  const v = encodeURIComponent(imageStorageKey.replace(/\.[^.]+$/, "").slice(0, 12));
  return `/api/mixed-container/catalog/categories/${id}/image?v=${v}`;
}

function toDiscoveryProduct(p: {
  id: string;
  productRef: string;
  name: string;
  shortDescription: string | null;
  marketInsightSummary: string | null;
  originCountry: string | null;
  moqPallets: number;
  imageStorageKey: string | null;
  packagingOptions?: ReturnType<typeof toPackagingOption>[];
  category: { name: string; slug: string };
}) {
  const packagingOptions = p.packagingOptions ?? [];
  const defaultPkg = packagingOptions.find((o) => o.isDefault) ?? packagingOptions[0];
  return {
    id: p.id,
    productRef: p.productRef,
    name: p.name,
    shortDescription: p.shortDescription,
    category: p.category.name,
    categorySlug: p.category.slug,
    originCountry: p.originCountry,
    packagingOptions,
    imageUrl: productImageUrl(p.id, p.imageStorageKey),
    moqPallets: defaultPkg?.moqPallets ?? p.moqPallets,
  };
}

function toCategoryCard(c: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageStorageKey: string | null;
  industry: { name: string; slug: string };
  _count: { products: number };
}) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    imageUrl: categoryImageUrl(c.id, c.imageStorageKey),
    industrySlug: c.industry.slug,
    industryName: c.industry.name,
    productCount: c._count.products,
  };
}

function toProductCard(p: {
  id: string;
  productRef: string;
  name: string;
  packagingOptions?: ReturnType<typeof toPackagingOption>[];
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
  category: { name: string; slug: string; industry: { name: string; slug: string } };
}) {
  const packagingOptions = p.packagingOptions ?? [];
  const defaultPkg = packagingOptions.find((o) => o.isDefault) ?? packagingOptions[0];
  return {
    id: p.id,
    productRef: p.productRef,
    name: p.name,
    category: p.category.name,
    categorySlug: p.category.slug,
    industrySlug: p.category.industry.slug,
    industryName: p.category.industry.name,
    packagingDescription: p.packagingDescription || (defaultPkg ? defaultPkg.name : ""),
    moqPallets: defaultPkg?.moqPallets ?? p.moqPallets,
    unitsPerPallet: defaultPkg?.unitsPerPallet ?? p.unitsPerPallet,
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
    packagingOptions,
    packingTypes: p.packingTypes ?? [],
    imageUrl: productImageUrl(p.id, p.imageStorageKey),
    updatedAt: p.updatedAt.toISOString(),
  };
}

const categoryInclude = {
  industry: true,
} as const;

const productCategoryInclude = {
  category: { include: categoryInclude },
} as const;

async function loadPackagingMap(prisma: PrismaClient, productIds: string[]) {
  if (!productIds.length) return new Map<string, ReturnType<typeof toPackagingOption>[]>();
  const rows = await prisma.catalogPackaging.findMany({
    where: { productId: { in: productIds }, status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const map = new Map<string, ReturnType<typeof toPackagingOption>[]>();
  for (const row of rows) {
    const arr = map.get(row.productId) ?? [];
    arr.push(toPackagingOption(row));
    map.set(row.productId, arr);
  }
  return map;
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

  async listIndustries() {
    const industries = await this.prisma.catalogIndustry.findMany({
      where: { status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: {
            categories: {
              where: {
                status: "ACTIVE",
                products: {
                  some: {
                    status: "ACTIVE",
                    packagingOptions: { some: { status: "ACTIVE" } },
                  },
                },
              },
            },
          },
        },
      },
    });
    return industries
      .filter((i) => i._count.categories > 0)
      .map((i) => ({
        id: i.id,
        slug: i.slug,
        name: i.name,
        categoryCount: i._count.categories,
      }));
  }

  async listCategories(industrySlug?: string) {
    const where: Prisma.CatalogCategoryWhereInput = {
      status: "ACTIVE",
      products: {
        some: {
          status: "ACTIVE",
          packagingOptions: { some: { status: "ACTIVE" } },
        },
      },
    };
    if (industrySlug) {
      where.industry = { slug: industrySlug, status: "ACTIVE" };
    }
    const cats = await this.prisma.catalogCategory.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: {
        industry: true,
        _count: {
          select: {
            products: {
              where: {
                status: "ACTIVE",
                packagingOptions: { some: { status: "ACTIVE" } },
              },
            },
          },
        },
      },
    });
    return cats.map((c) => toCategoryCard(c));
  }

  async listProducts(query: CatalogListQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 24, 100);
    const where: Prisma.CatalogProductWhereInput = {
      status: "ACTIVE",
      packagingOptions: { some: { status: "ACTIVE" } },
    };
    if (query.industry) {
      where.category = { ...(where.category as object), industry: { slug: query.industry } };
    }
    if (query.category) {
      where.category = { ...(where.category as object), slug: query.category };
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
        { category: { name: { contains: query.q, mode: "insensitive" } } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.catalogProduct.findMany({
        where,
        include: productCategoryInclude,
        orderBy: { productRef: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.catalogProduct.count({ where }),
    ]);
    const packagingMap = await loadPackagingMap(this.prisma, items.map((p) => p.id));
    return {
      items: items.map((p) =>
        toDiscoveryProduct({
          ...p,
          packagingOptions: packagingMap.get(p.id) ?? [],
        }),
      ),
      total,
      page,
      limit,
    };
  }

  async getProduct(id: string) {
    const p = await this.prisma.catalogProduct.findFirst({
      where: { id, status: "ACTIVE" },
      include: productCategoryInclude,
    });
    if (!p) throw new AppError(404, "PRODUCT_NOT_FOUND");
    const packagingMap = await loadPackagingMap(this.prisma, [p.id]);
    return {
      ...toDiscoveryProduct({
        ...p,
        packagingOptions: packagingMap.get(p.id) ?? [],
      }),
      description: p.marketInsightSummary ?? p.shortDescription,
    };
  }

  async getProductByRef(productRef: string) {
    const p = await this.prisma.catalogProduct.findFirst({
      where: { productRef, status: "ACTIVE" },
      include: productCategoryInclude,
    });
    if (!p) throw new AppError(404, "PRODUCT_NOT_FOUND");
    const packagingMap = await loadPackagingMap(this.prisma, [p.id]);
    return {
      ...toDiscoveryProduct({
        ...p,
        packagingOptions: packagingMap.get(p.id) ?? [],
      }),
      description: p.marketInsightSummary ?? p.shortDescription,
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

  async getCategoryImage(id: string): Promise<{ path: string; mime: string }> {
    const c = await this.prisma.catalogCategory.findFirst({
      where: { id, status: "ACTIVE" },
      select: { imageStorageKey: true, imageMimeType: true },
    });
    if (!c?.imageStorageKey || !c.imageMimeType) throw new AppError(404, "IMAGE_NOT_FOUND");
    const path = await assertStoredFileExists(c.imageStorageKey);
    return { path, mime: c.imageMimeType };
  }

  // ── Admin ──

  async adminListCategories() {
    return this.prisma.catalogCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { industry: true },
    });
  }

  async adminCreateCategory(input: AdminCatalogCategoryInput) {
    return this.prisma.catalogCategory.create({ data: input });
  }

  async adminUpdateCategory(id: string, input: Partial<AdminCatalogCategoryInput>) {
    return this.prisma.catalogCategory.update({ where: { id }, data: input });
  }

  async adminListProducts() {
    const items = await this.prisma.catalogProduct.findMany({
      include: productCategoryInclude,
      orderBy: { updatedAt: "desc" },
    });
    const [packagingMap, packingMap] = await Promise.all([
      loadPackagingMap(this.prisma, items.map((p) => p.id)),
      loadMcPackingMap(this.prisma, items.map((p) => p.id)),
    ]);
    return items.map((p) => ({
      ...toProductCard({
        ...p,
        packagingOptions: packagingMap.get(p.id) ?? [],
        packingTypes: packingMap.get(p.id) ?? [],
      }),
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
    return { imageUrl: productImageUrl(id, storageKey) };
  }

  async streamImage(path: string, res: import("express").Response) {
    res.setHeader("Content-Type", "image/jpeg");
    fs.createReadStream(path).pipe(res);
  }
}
