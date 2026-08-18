// apps/backend/prisma/seed.ts
//
// Production staff + catalog seed — no demo RFQs or test users.
//
import { PrismaClient, Role } from "@prisma/client";
import {
  BULK_CONTAINER_CATEGORY_DEFAULT_PACKING,
  BULK_CONTAINER_LOCKED_PACKING_TYPES,
  lockedPackingCodesForCategory,
} from "@dmx/contracts/bulk-container-packing-locked";
import {
  MC_INDUSTRY,
  MC_LAUNCH_CATEGORIES,
  MC_RETIRED_CATEGORY_SLUGS,
  packagingSlug,
  packingTypeCode,
} from "./mc-catalog-taxonomy.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding DeMaxtore database…");

  // ── Organisations ────────────────────────────────────────────────────────
  const demaxtore = await prisma.organisation.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: { name: "DeMaxtore Operations", kind: "DEMAXTORE" },
    create: { id: "00000000-0000-0000-0000-000000000001", name: "DeMaxtore Operations", kind: "DEMAXTORE" },
  });
  const salesOrg = await prisma.organisation.upsert({
    where: { id: "00000000-0000-0000-0000-0000000000a1" },
    update: { name: "DeMaxtore Sales", kind: "DEMAXTORE" },
    create: { id: "00000000-0000-0000-0000-0000000000a1", name: "DeMaxtore Sales", kind: "DEMAXTORE" },
  });

  // ── Staff users ───────────────────────────────────────────────────────────
  const staffPassword = await bcrypt.hash("Demaxtore35", 10);
  const admin = await prisma.user.upsert({
    where: { email: "ugur@demaxtore.com" },
    update: { displayName: "Uğur Kazancı", role: Role.ADMIN, passwordHash: staffPassword, organisationId: demaxtore.id },
    create: { email: "ugur@demaxtore.com", passwordHash: staffPassword, displayName: "Uğur Kazancı", role: Role.ADMIN, organisationId: demaxtore.id },
  });
  console.log("  · staff users:", admin.email);

  // ── Mixed Container catalog (Sprint 01 — Product Taxonomy) ───────────────
  const industry = await prisma.catalogIndustry.upsert({
    where: { slug: MC_INDUSTRY.slug },
    update: { name: MC_INDUSTRY.name, sortOrder: 1, status: "ACTIVE" },
    create: { slug: MC_INDUSTRY.slug, name: MC_INDUSTRY.name, sortOrder: 1, status: "ACTIVE" },
  });

  for (const slug of MC_RETIRED_CATEGORY_SLUGS) {
    await prisma.catalogCategory.updateMany({
      where: { slug },
      data: { status: "DISCONTINUED" },
    });
    const retired = await prisma.catalogCategory.findUnique({ where: { slug } });
    if (retired) {
      await prisma.catalogProduct.updateMany({
        where: { categoryId: retired.id },
        data: { status: "DISCONTINUED" },
      });
    }
  }

  const mcPtMap = new Map<string, string>();
  async function ensurePackingType(
    code: string,
    name: string,
    segment: string,
    unitWeight?: number,
    unitWeightUom?: string,
  ) {
    if (mcPtMap.has(code)) return mcPtMap.get(code)!;
    const row = await prisma.packingType.upsert({
      where: { code },
      update: { name, segment, unitWeight: unitWeight ?? null, unitWeightUom: unitWeightUom ?? null, isActive: true },
      create: {
        code,
        name,
        segment,
        unitWeight: unitWeight ?? null,
        unitWeightUom: unitWeightUom ?? null,
        isActive: true,
      },
    });
    mcPtMap.set(code, row.id);
    return row.id;
  }

  let productCount = 0;
  for (const cat of MC_LAUNCH_CATEGORIES) {
    const category = await prisma.catalogCategory.upsert({
      where: { slug: cat.slug },
      update: {
        industryId: industry.id,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        status: "ACTIVE",
      },
      create: {
        industryId: industry.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        sortOrder: cat.sortOrder,
        status: "ACTIVE",
      },
    });

    const packagingDefs = cat.packaging.map((pkg, idx) => ({
      ...pkg,
      slug: packagingSlug(pkg.name),
      sortOrder: idx + 1,
      code: packingTypeCode(cat.slug, pkg.name),
    }));

    for (const pkg of packagingDefs) {
      await ensurePackingType(
        pkg.code,
        pkg.name,
        pkg.segment ?? "RETAIL",
        pkg.unitWeight,
        pkg.unitWeightUom,
      );
    }

    const defaultPkg =
      (cat.slug === "pasta" || cat.slug === "wheat-flour"
        ? packagingDefs.find((p) => p.name === "500 gr")
        : null) ??
      packagingDefs[1] ??
      packagingDefs[0]!;
    const keepRefs = cat.products.map((p) => p.ref);
    const keepSlugs = packagingDefs.map((p) => p.slug);

    for (const prod of cat.products) {
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
      productCount += 1;

      for (let i = 0; i < packagingDefs.length; i++) {
        const pkg = packagingDefs[i]!;
        const packingTypeId = await ensurePackingType(
          pkg.code,
          pkg.name,
          pkg.segment ?? "RETAIL",
          pkg.unitWeight,
          pkg.unitWeightUom,
        );
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
            packingTypeId,
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
            packingTypeId,
          },
        });
        await prisma.productPackingType.upsert({
          where: {
            catalogKind_productId_packingTypeId: {
              catalogKind: "MIXED_CONTAINER",
              productId: product.id,
              packingTypeId,
            },
          },
          update: { isActive: true, isDefault },
          create: {
            catalogKind: "MIXED_CONTAINER",
            productId: product.id,
            packingTypeId,
            isDefault,
            isActive: true,
          },
        });
      }

      await prisma.catalogPackaging.updateMany({
        where: { productId: product.id, slug: { notIn: keepSlugs } },
        data: { status: "DISCONTINUED", isDefault: false },
      });
    }

    await prisma.catalogProduct.updateMany({
      where: {
        categoryId: category.id,
        productRef: { notIn: keepRefs },
        status: { not: "DISCONTINUED" },
      },
      data: { status: "DISCONTINUED" },
    });
  }
  console.log(
    "  · mixed container catalog:",
    productCount,
    "products across",
    MC_LAUNCH_CATEGORIES.length,
    "categories in",
    MC_INDUSTRY.name,
  );

  // ── Bulk Container catalog (Sprint 13B) ───────────────────────────────────
  const BC_SPEC_TEMPLATES = [
    {
      productType: "WHEAT_FLOUR",
      name: "Wheat Flour Specification",
      schema: {
        productType: "WHEAT_FLOUR",
        parameters: [
          { key: "protein", label: "Protein", type: "range", unit: "%", required: true, min: 11, max: 13 },
          { key: "ash", label: "Ash", type: "max", unit: "%", required: true, max: 0.65 },
          { key: "moisture", label: "Moisture", type: "max", unit: "%", required: true, max: 14.5 },
          { key: "wetGluten", label: "Wet Gluten", type: "range", unit: "%", required: true, min: 26, max: 32 },
          { key: "packing", label: "Packing", type: "enum", required: true, options: ["50 kg PP woven", "25 kg paper"] },
          { key: "origin", label: "Origin", type: "enum", required: true, options: ["Turkey"] },
        ],
      },
    },
    {
      productType: "SEMOLINA",
      name: "Semolina Specification",
      schema: {
        productType: "SEMOLINA",
        parameters: [
          { key: "protein", label: "Protein", type: "range", unit: "%", required: true, min: 12, max: 13.5 },
          { key: "ash", label: "Ash", type: "max", unit: "%", required: true, max: 0.65 },
          { key: "granulation", label: "Granulation", type: "enum", required: true, options: ["Fine", "Medium", "Coarse"] },
          { key: "moisture", label: "Moisture", type: "max", unit: "%", required: true, max: 14.5 },
          { key: "packing", label: "Packing", type: "enum", required: true, options: ["25 kg PP woven"] },
        ],
      },
    },
    {
      productType: "PASTA",
      name: "Pasta Specification",
      schema: {
        productType: "PASTA",
        parameters: [
          { key: "shape", label: "Shape", type: "enum", required: true, options: ["Penne", "Spaghetti", "Fusilli", "Macaroni"] },
          { key: "packing", label: "Packing", type: "enum", required: true, options: ["25 kg bag", "10 kg carton"] },
          { key: "protein", label: "Protein", type: "range", unit: "%", required: true, min: 11, max: 13 },
        ],
      },
    },
    {
      productType: "BULGUR",
      name: "Bulgur Specification",
      schema: {
        productType: "BULGUR",
        parameters: [
          { key: "type", label: "Type", type: "enum", required: true, options: ["Yellow", "Brown", "Whole grain"] },
          { key: "coarse", label: "Coarse", type: "enum", required: false, options: ["#1", "#2", "#3"] },
          { key: "medium", label: "Medium", type: "enum", required: false, options: ["#4", "#5"] },
          { key: "fine", label: "Fine", type: "enum", required: false, options: ["#6", "#7"] },
          { key: "packing", label: "Packing", type: "enum", required: true, options: ["25 kg bag", "50 kg bag"] },
          { key: "origin", label: "Origin", type: "enum", required: true, options: ["Turkey"] },
        ],
      },
    },
    {
      productType: "PULSES",
      name: "Pulses Specification",
      schema: {
        productType: "PULSES",
        parameters: [
          { key: "productType", label: "Product Type", type: "enum", required: true, options: ["Red Lentils", "Green Lentils", "Chickpeas", "White Beans", "Kidney Beans", "Peas"] },
          { key: "origin", label: "Origin", type: "enum", required: true, options: ["Turkey"] },
          { key: "cropYear", label: "Crop Year", type: "year", required: true },
          { key: "packing", label: "Packing", type: "enum", required: true, options: ["25 kg bag", "50 kg bag"] },
        ],
      },
    },
    {
      productType: "SALT",
      name: "Salt Specification",
      schema: {
        productType: "SALT",
        parameters: [
          { key: "refined", label: "Refined", type: "enum", required: false, options: ["Yes", "No"] },
          { key: "industrial", label: "Industrial", type: "enum", required: false, options: ["Yes", "No"] },
          { key: "iodized", label: "Iodized", type: "enum", required: true, options: ["Yes", "No"] },
          { key: "packing", label: "Packing", type: "enum", required: true, options: ["25 kg bag", "50 kg bag", "1 MT big bag"] },
          { key: "origin", label: "Origin", type: "enum", required: true, options: ["Turkey"] },
        ],
      },
    },
  ] as const;

  const specMap = new Map<string, string>();
  for (const t of BC_SPEC_TEMPLATES) {
    const existing = await prisma.bulkSpecTemplate.findFirst({ where: { productType: t.productType } });
    const row = existing
      ? await prisma.bulkSpecTemplate.update({
          where: { id: existing.id },
          data: { name: t.name, schema: t.schema, isActive: true },
        })
      : await prisma.bulkSpecTemplate.create({
          data: { productType: t.productType, name: t.name, schema: t.schema, isActive: true },
        });
    specMap.set(t.productType, row.id);
  }

  const BC_CATEGORIES = [
    { slug: "wheat-flour", name: "Wheat Flour", sortOrder: 1 },
    { slug: "semolina", name: "Semolina", sortOrder: 2 },
    { slug: "pasta", name: "Pasta", sortOrder: 3 },
    { slug: "bulgur", name: "Bulgur", sortOrder: 4 },
    { slug: "pulses", name: "Pulses", sortOrder: 5 },
    { slug: "salt", name: "Salt", sortOrder: 6 },
  ] as const;

  const bcCatMap = new Map<string, string>();
  for (const c of BC_CATEGORIES) {
    const row = await prisma.bulkCatalogCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder, status: "ACTIVE" },
      create: { slug: c.slug, name: c.name, sortOrder: c.sortOrder, status: "ACTIVE" },
    });
    bcCatMap.set(c.slug, row.id);
  }

  const BC_PRODUCTS = [
    { ref: "BC-FLOUR-001", cat: "wheat-flour", type: "WHEAT_FLOUR", name: "Industrial Wheat Flour", pack: "50 kg PP woven bags", low: 320, high: 360 },
    { ref: "BC-SEMOLINA-001", cat: "semolina", type: "SEMOLINA", name: "Durum Semolina", pack: "25 kg PP woven bags", low: 380, high: 420 },
    { ref: "BC-PASTA-001", cat: "pasta", type: "PASTA", name: "Bulk Pasta Penne", pack: "25 kg bags", low: 450, high: 490 },
    { ref: "BC-BULGUR-001", cat: "bulgur", type: "BULGUR", name: "Yellow Bulgur Coarse", pack: "25 kg bags", low: 340, high: 380 },
    { ref: "BC-PULSE-001", cat: "pulses", type: "PULSES", name: "Red Lentils", pack: "25 kg bags", low: 520, high: 580 },
    { ref: "BC-PULSE-002", cat: "pulses", type: "PULSES", name: "Chickpeas", pack: "25 kg bags", low: 480, high: 540 },
    { ref: "BC-PULSE-003", cat: "pulses", type: "PULSES", name: "White Beans", pack: "25 kg bags", low: 460, high: 510 },
    { ref: "BC-SALT-001", cat: "salt", type: "SALT", name: "Refined Table Salt", pack: "25 kg bags", low: 80, high: 120 },
  ] as const;

  for (const p of BC_PRODUCTS) {
    await prisma.bulkCatalogProduct.upsert({
      where: { productRef: p.ref },
      update: {},
      create: {
        productRef: p.ref,
        categoryId: bcCatMap.get(p.cat)!,
        name: p.name,
        standardPacking: p.pack,
        specTemplateId: specMap.get(p.type)!,
        marketStatus: "STABLE",
        indicativeLow: p.low,
        indicativeHigh: p.high,
        indicativeCurrency: "USD",
        minOrderMt: 1,
        status: "ACTIVE",
      },
    });
  }
  console.log("  · bulk container catalog:", BC_PRODUCTS.length, "products across", BC_CATEGORIES.length, "categories");

  // ── Packing Types (Sprint 13B.1) ─────────────────────────────────────────
  type PtSeed = {
    code: string;
    name: string;
    segment: string;
    unitWeight?: number;
    unitWeightUom?: string;
  };

  const PACKING_TYPES: PtSeed[] = [
    { code: "PT-MC-PASTA-250GR", name: "250 gr", segment: "RETAIL", unitWeight: 0.25, unitWeightUom: "kg" },
    { code: "PT-MC-PASTA-400GR", name: "400 gr", segment: "RETAIL", unitWeight: 0.4, unitWeightUom: "kg" },
    { code: "PT-MC-PASTA-500GR", name: "500 gr", segment: "RETAIL", unitWeight: 0.5, unitWeightUom: "kg" },
    { code: "PT-MC-PASTA-5KG", name: "5 kg", segment: "INDUSTRIAL", unitWeight: 5, unitWeightUom: "kg" },
    { code: "PT-MC-OIL-1L", name: "1L", segment: "RETAIL", unitWeight: 1, unitWeightUom: "L" },
    { code: "PT-MC-OIL-2L", name: "2L", segment: "RETAIL", unitWeight: 2, unitWeightUom: "L" },
    { code: "PT-MC-OIL-3L", name: "3L", segment: "HORECA", unitWeight: 3, unitWeightUom: "L" },
    { code: "PT-MC-OIL-5L", name: "5L", segment: "HORECA", unitWeight: 5, unitWeightUom: "L" },
    { code: "PT-MC-OIL-10L", name: "10L", segment: "INDUSTRIAL", unitWeight: 10, unitWeightUom: "L" },
    { code: "PT-MC-TOMATOP-350GRJAR", name: "350 gr (jar)", segment: "RETAIL", unitWeight: 0.35, unitWeightUom: "kg" },
    { code: "PT-MC-TOMATOP-700GRJAR", name: "700 gr (jar)", segment: "RETAIL", unitWeight: 0.7, unitWeightUom: "kg" },
    { code: "PT-MC-TOMATOP-830GRTIN", name: "830 gr (tin)", segment: "RETAIL", unitWeight: 0.83, unitWeightUom: "kg" },
    { code: "PT-MC-TOMATOP-1650GRJAR", name: "1650 gr (jar)", segment: "HORECA", unitWeight: 1.65, unitWeightUom: "kg" },
    { code: "PT-MC-TOMATOP-4350GRTIN", name: "4350 gr (tin)", segment: "INDUSTRIAL", unitWeight: 4.35, unitWeightUom: "kg" },
    { code: "PT-MC-PULSE-500G", name: "500g", segment: "RETAIL", unitWeight: 0.5, unitWeightUom: "kg" },
    { code: "PT-MC-PULSE-1KG", name: "1kg", segment: "RETAIL", unitWeight: 1, unitWeightUom: "kg" },
    { code: "PT-MC-PULSE-2KG", name: "2kg", segment: "HORECA", unitWeight: 2, unitWeightUom: "kg" },
    { code: "PT-MC-PULSE-5KG", name: "5kg", segment: "HORECA", unitWeight: 5, unitWeightUom: "kg" },
    ...BULK_CONTAINER_LOCKED_PACKING_TYPES.map((p) => ({
      code: p.code,
      name: p.name,
      segment: p.segment,
      unitWeight: p.unitWeight,
      unitWeightUom: p.unitWeightUom,
    })),
  ];

  const ptMap = new Map<string, string>();
  for (const pt of PACKING_TYPES) {
    const row = await prisma.packingType.upsert({
      where: { code: pt.code },
      update: { name: pt.name, segment: pt.segment, unitWeight: pt.unitWeight ?? null, unitWeightUom: pt.unitWeightUom ?? null, isActive: true },
      create: {
        code: pt.code,
        name: pt.name,
        segment: pt.segment,
        unitWeight: pt.unitWeight ?? null,
        unitWeightUom: pt.unitWeightUom ?? null,
        isActive: true,
      },
    });
    ptMap.set(pt.code, row.id);
  }

  async function assignPacking(
    catalogKind: "MIXED_CONTAINER" | "BULK_CONTAINER",
    productId: string,
    codes: string[],
    defaultCode: string,
  ) {
    for (const code of codes) {
      const packingTypeId = ptMap.get(code)!;
      await prisma.productPackingType.upsert({
        where: {
          catalogKind_productId_packingTypeId: { catalogKind, productId, packingTypeId },
        },
        update: { isActive: true, isDefault: code === defaultCode },
        create: {
          catalogKind,
          productId,
          packingTypeId,
          isDefault: code === defaultCode,
          isActive: true,
        },
      });
    }
  }

  const bcProducts = await prisma.bulkCatalogProduct.findMany({ include: { category: true } });
  for (const p of bcProducts) {
    const slug = p.category.slug as keyof typeof BULK_CONTAINER_CATEGORY_DEFAULT_PACKING;
    const codes = [...lockedPackingCodesForCategory(slug)];
    const defaultCode = BULK_CONTAINER_CATEGORY_DEFAULT_PACKING[slug];
    if (!codes.length || !defaultCode) continue;
    await assignPacking("BULK_CONTAINER", p.id, codes, defaultCode);
  }

  const fallbackPt =
    ptMap.get(packingTypeCode("pasta", "500 gr")) ??
    ptMap.get("PT-MC-PASTA-500GR") ??
    [...ptMap.values()][0]!;
  for (const line of await prisma.containerLine.findMany({ where: { packingTypeId: "00000000-0000-0000-0000-000000000001" } })) {
    const link = await prisma.productPackingType.findFirst({
      where: { catalogKind: "MIXED_CONTAINER", productId: line.catalogProductId, isDefault: true, isActive: true },
    });
    await prisma.containerLine.update({
      where: { id: line.id },
      data: { packingTypeId: link?.packingTypeId ?? fallbackPt },
    });
  }
  for (const line of await prisma.bulkContainerLine.findMany({ where: { packingTypeId: "00000000-0000-0000-0000-000000000001" } })) {
    const link = await prisma.productPackingType.findFirst({
      where: { catalogKind: "BULK_CONTAINER", productId: line.catalogProductId, isDefault: true, isActive: true },
    });
    await prisma.bulkContainerLine.update({
      where: { id: line.id },
      data: { packingTypeId: link?.packingTypeId ?? ptMap.get("PT-BC-FLOUR-25KG")! },
    });
  }

  await prisma.packingType.updateMany({
    where: { code: "PT-MIGRATION-FALLBACK" },
    data: { isActive: false },
  });

  console.log("  · packing types:", PACKING_TYPES.length, "types assigned to MC/BC catalog products");

  // ── Monthly reference freight rates (Estimated CIF decision-support) ─────
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  monthEnd.setUTCDate(0);
  monthEnd.setUTCHours(23, 59, 59, 999);

  const REFERENCE_FREIGHT_SEED = [
    { originPort: "CNSHA", destinationPort: "NLRTM", containerType: "20GP", referenceFreight: 2800 },
    { originPort: "TRMER", destinationPort: "NGLOS", containerType: "20GP", referenceFreight: 2450 },
    { originPort: "TRIZM", destinationPort: "GHTEM", containerType: "40HC", referenceFreight: 3300 },
    { originPort: "TRAMB", destinationPort: "USNYC", containerType: "40HC", referenceFreight: 3850 },
  ] as const;

  for (const row of REFERENCE_FREIGHT_SEED) {
    const existing = await prisma.referenceFreightRate.findFirst({
      where: {
        originPort: row.originPort,
        destinationPort: row.destinationPort,
        containerType: row.containerType,
        validFrom: monthStart,
      },
    });
    if (existing) {
      await prisma.referenceFreightRate.update({
        where: { id: existing.id },
        data: {
          referenceFreight: row.referenceFreight,
          validUntil: monthEnd,
          createdById: admin.id,
        },
      });
    } else {
      await prisma.referenceFreightRate.create({
        data: {
          ...row,
          currency: "USD",
          validFrom: monthStart,
          validUntil: monthEnd,
          createdById: admin.id,
        },
      });
    }
  }
  console.log("  · reference freight rates:", REFERENCE_FREIGHT_SEED.length, "lanes for current month");

  console.log("✓ Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
