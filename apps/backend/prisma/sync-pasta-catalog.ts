/**
 * Sync Mixed Container Pasta category products + packaging to taxonomy.
 * Run: npx tsx prisma/sync-pasta-catalog.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  MC_LAUNCH_CATEGORIES,
  packagingSlug,
  packingTypeCode,
} from "./mc-catalog-taxonomy";

const prisma = new PrismaClient();

async function main() {
  const pasta = MC_LAUNCH_CATEGORIES.find((c) => c.slug === "pasta");
  if (!pasta) throw new Error("pasta category missing from taxonomy");

  const category = await prisma.catalogCategory.findUniqueOrThrow({
    where: { slug: "pasta" },
  });

  const packagingDefs = pasta.packaging.map((pkg, idx) => ({
    ...pkg,
    slug: packagingSlug(pkg.name),
    sortOrder: idx + 1,
    code: packingTypeCode(pasta.slug, pkg.name),
  }));

  const defaultPkg =
    packagingDefs.find((p) => p.name === "500 gr") ??
    packagingDefs[2] ??
    packagingDefs[0]!;

  const keepRefs = new Set(pasta.products.map((p) => p.ref));

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

  for (const prod of pasta.products) {
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

    const keepSlugs = new Set(packagingDefs.map((p) => p.slug));

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
      where: { productId: product.id, slug: { notIn: [...keepSlugs] } },
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

  console.log("Pasta products (ACTIVE):");
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
