/**
 * Sync a Mixed Container launch category from mc-catalog-taxonomy.ts to the DB.
 * Usage: npx tsx prisma/sync-mc-category.ts wheat-flour
 */
import { PrismaClient } from "@prisma/client";
import {
  MC_LAUNCH_CATEGORIES,
  packagingSlug,
  packingTypeCode,
} from "./mc-catalog-taxonomy";

const prisma = new PrismaClient();
const slug = process.argv[2];

async function main() {
  if (!slug) {
    console.error("Usage: npx tsx prisma/sync-mc-category.ts <category-slug>");
    process.exit(1);
  }

  const def = MC_LAUNCH_CATEGORIES.find((c) => c.slug === slug);
  if (!def) throw new Error(`Category "${slug}" not in MC_LAUNCH_CATEGORIES`);

  const category = await prisma.catalogCategory.upsert({
    where: { slug: def.slug },
    update: {
      name: def.name,
      description: def.description,
      sortOrder: def.sortOrder,
      status: "ACTIVE",
    },
    create: {
      slug: def.slug,
      name: def.name,
      description: def.description,
      sortOrder: def.sortOrder,
      status: "ACTIVE",
      industry: { connect: { slug: "food-beverages" } },
    },
  });

  const packagingDefs = def.packaging.map((pkg, idx) => ({
    ...pkg,
    slug: packagingSlug(pkg.name),
    sortOrder: idx + 1,
    code: packingTypeCode(def.slug, pkg.name),
  }));

  const defaultPkg =
    packagingDefs.find((p) => p.name === "500 gr") ??
    packagingDefs.find((p) => p.name.startsWith("350 gr")) ??
    packagingDefs[0]!;

  const keepRefs = new Set(def.products.map((p) => p.ref));
  const keepSlugs = packagingDefs.map((p) => p.slug);

  for (const pkg of packagingDefs) {
    await prisma.packingType.upsert({
      where: { code: pkg.code },
      update: {
        name: pkg.name,
        segment: pkg.segment ?? "RETAIL",
        unitWeight: pkg.unitWeight ?? null,
        unitWeightUom: pkg.unitWeightUom ?? null,
        isActive: true,
      },
      create: {
        code: pkg.code,
        name: pkg.name,
        segment: pkg.segment ?? "RETAIL",
        unitWeight: pkg.unitWeight ?? null,
        unitWeightUom: pkg.unitWeightUom ?? null,
        isActive: true,
      },
    });
  }

  for (const prod of def.products) {
    const product = await prisma.catalogProduct.upsert({
      where: { productRef: prod.ref },
      update: {
        categoryId: category.id,
        name: prod.name,
        shortDescription: `${prod.name} from verified Turkish manufacturers.`,
        packagingDescription: defaultPkg.name,
        unitsPerPallet: defaultPkg.unitsPerPallet,
        moqPallets: defaultPkg.moqPallets ?? 1,
        sampleAvailable: prod.sample ?? false,
        sampleLeadDays: prod.sample ? 5 : null,
        marketStatus: prod.market ?? "STABLE",
        indicativeLow: prod.low,
        indicativeMid: prod.mid,
        indicativeHigh: prod.high,
        originCountry: "Turkey",
        status: "ACTIVE",
      },
      create: {
        productRef: prod.ref,
        categoryId: category.id,
        name: prod.name,
        shortDescription: `${prod.name} from verified Turkish manufacturers.`,
        packagingDescription: defaultPkg.name,
        unitsPerPallet: defaultPkg.unitsPerPallet,
        moqPallets: defaultPkg.moqPallets ?? 1,
        sampleAvailable: prod.sample ?? false,
        sampleLeadDays: prod.sample ? 5 : null,
        marketStatus: prod.market ?? "STABLE",
        indicativeLow: prod.low,
        indicativeMid: prod.mid,
        indicativeHigh: prod.high,
        indicativeCurrency: "USD",
        originCountry: "Turkey",
        certifications: [],
        marketInsightSummary: `${prod.name} — sourced from verified Turkish manufacturers.`,
        supplierCount: 3,
        status: "ACTIVE",
      },
    });

    for (const pkg of packagingDefs) {
      const packingType = await prisma.packingType.findUniqueOrThrow({
        where: { code: pkg.code },
      });
      const isDefault = pkg.slug === defaultPkg.slug;
      await prisma.catalogPackaging.upsert({
        where: { productId_slug: { productId: product.id, slug: pkg.slug } },
        update: {
          name: pkg.name,
          unitsPerPallet: pkg.unitsPerPallet,
          moqPallets: pkg.moqPallets ?? 1,
          sortOrder: pkg.sortOrder,
          isDefault,
          status: "ACTIVE",
          packingTypeId: packingType.id,
        },
        create: {
          productId: product.id,
          slug: pkg.slug,
          name: pkg.name,
          unitsPerPallet: pkg.unitsPerPallet,
          moqPallets: pkg.moqPallets ?? 1,
          sortOrder: pkg.sortOrder,
          isDefault,
          status: "ACTIVE",
          packingTypeId: packingType.id,
        },
      });
      await prisma.productPackingType.upsert({
        where: {
          catalogKind_productId_packingTypeId: {
            catalogKind: "MIXED_CONTAINER",
            productId: product.id,
            packingTypeId: packingType.id,
          },
        },
        update: { isActive: true, isDefault },
        create: {
          catalogKind: "MIXED_CONTAINER",
          productId: product.id,
          packingTypeId: packingType.id,
          isDefault,
          isActive: true,
        },
      });
    }

    await prisma.catalogPackaging.updateMany({
      where: { productId: product.id, slug: { notIn: keepSlugs } },
      data: { status: "DISCONTINUED", isDefault: false },
    });

    const keepPtIds = (
      await prisma.packingType.findMany({
        where: { code: { in: packagingDefs.map((p) => p.code) } },
        select: { id: true },
      })
    ).map((r) => r.id);

    await prisma.productPackingType.updateMany({
      where: {
        catalogKind: "MIXED_CONTAINER",
        productId: product.id,
        packingTypeId: { notIn: keepPtIds },
      },
      data: { isActive: false, isDefault: false },
    });
  }

  const discontinued = await prisma.catalogProduct.updateMany({
    where: {
      categoryId: category.id,
      productRef: { notIn: [...keepRefs] },
      status: { not: "DISCONTINUED" },
    },
    data: { status: "DISCONTINUED" },
  });

  const active = await prisma.catalogProduct.findMany({
    where: { categoryId: category.id, status: "ACTIVE" },
    orderBy: { productRef: "asc" },
    select: { productRef: true, name: true },
  });

  console.log(`${def.name} products (ACTIVE):`);
  for (const p of active) console.log(`  ${p.productRef} — ${p.name}`);
  console.log(`Discontinued stale products: ${discontinued.count}`);
  console.log(
    "Packaging:",
    packagingDefs.map((p) => `${p.sortOrder}. ${p.name}`).join(", "),
    `(default: ${defaultPkg.name})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
