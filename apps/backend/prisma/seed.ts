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

  // ── Mixed Container catalog (Sprint 12B) ─────────────────────────────────
  const MC_CATEGORIES = [
    { slug: "pasta", name: "Pasta", sortOrder: 1 },
    { slug: "sunflower-oil", name: "Sunflower Oil", sortOrder: 2 },
    { slug: "flour", name: "Flour", sortOrder: 3 },
    { slug: "pulses", name: "Pulses", sortOrder: 4 },
    { slug: "rice", name: "Rice", sortOrder: 5 },
    { slug: "tomato-paste", name: "Tomato Paste", sortOrder: 6 },
    { slug: "biscuits", name: "Biscuits", sortOrder: 7 },
    { slug: "sugar", name: "Sugar", sortOrder: 8 },
    { slug: "canned-food", name: "Canned Food", sortOrder: 9 },
  ] as const;

  const catMap = new Map<string, string>();
  for (const c of MC_CATEGORIES) {
    const row = await prisma.catalogCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder, status: "ACTIVE" },
      create: { slug: c.slug, name: c.name, sortOrder: c.sortOrder, status: "ACTIVE" },
    });
    catMap.set(c.slug, row.id);
  }

  const MC_PRODUCTS = [
    { ref: "MC-PASTA-001", cat: "pasta", name: "Penne Rigate 500g", pkg: "60 × 500g cartons / pallet", units: 60, moq: 1, low: 680, mid: 720, high: 760, sample: true, market: "STABLE", origin: "Italy", certs: ["BRC"] },
    { ref: "MC-PASTA-002", cat: "pasta", name: "Spaghetti 400g", pkg: "80 × 400g cartons / pallet", units: 80, moq: 2, low: 590, mid: 640, high: 690, sample: true, market: "STABLE", origin: "Italy", certs: ["BRC"] },
    { ref: "MC-OIL-001", cat: "sunflower-oil", name: "Refined Sunflower Oil 1L", pkg: "60 × 1L bottles / pallet", units: 60, moq: 1, low: 890, mid: 945, high: 980, sample: true, market: "RISING", origin: "Ukraine", certs: ["Halal"] },
    { ref: "MC-FLOUR-001", cat: "flour", name: "All-Purpose Wheat Flour 25kg", pkg: "40 × 25kg bags / pallet", units: 40, moq: 2, low: 520, mid: 560, high: 600, sample: false, market: "STABLE", origin: "Turkey", certs: [] },
    { ref: "MC-PULSE-001", cat: "pulses", name: "Red Lentils 25kg", pkg: "40 × 25kg bags / pallet", units: 40, moq: 2, low: 780, mid: 820, high: 860, sample: true, market: "STABLE", origin: "Canada", certs: ["Organic"] },
    { ref: "MC-RICE-001", cat: "rice", name: "Premium Basmati Rice 5kg", pkg: "50 × 5kg bags / pallet", units: 50, moq: 2, low: 1180, mid: 1260, high: 1340, sample: true, market: "RISING", origin: "India", certs: ["BRC", "Halal"] },
    { ref: "MC-RICE-002", cat: "rice", name: "Jasmine Rice 1kg", pkg: "80 × 1kg bags / pallet", units: 80, moq: 2, low: 920, mid: 985, high: 1050, sample: true, market: "STABLE", origin: "Thailand", certs: [] },
    { ref: "MC-TOMATO-001", cat: "tomato-paste", name: "Tomato Paste 400g", pkg: "48 × 400g tins / pallet", units: 48, moq: 1, low: 640, mid: 690, high: 740, sample: true, market: "SHORT", origin: "Turkey", certs: ["BRC"] },
    { ref: "MC-BISC-001", cat: "biscuits", name: "Digestive Biscuits 400g", pkg: "72 × 400g cartons / pallet", units: 72, moq: 1, low: 710, mid: 760, high: 810, sample: true, market: "STABLE", origin: "UK", certs: [] },
    { ref: "MC-SUGAR-001", cat: "sugar", name: "White Crystal Sugar 1kg", pkg: "100 × 1kg bags / pallet", units: 100, moq: 2, low: 480, mid: 520, high: 560, sample: false, market: "STABLE", origin: "Brazil", certs: [] },
    { ref: "MC-CAN-001", cat: "canned-food", name: "Canned Tuna in Oil 185g", pkg: "96 × 185g tins / pallet", units: 96, moq: 1, low: 720, mid: 765, high: 810, sample: true, market: "STABLE", origin: "Ecuador", certs: ["BRC"] },
    { ref: "MC-CAN-002", cat: "canned-food", name: "Canned Sweet Corn 340g", pkg: "84 × 340g tins / pallet", units: 84, moq: 1, low: 580, mid: 620, high: 660, sample: true, market: "STABLE", origin: "Thailand", certs: [] },
  ] as const;

  for (const p of MC_PRODUCTS) {
    await prisma.catalogProduct.upsert({
      where: { productRef: p.ref },
      update: {},
      create: {
        productRef: p.ref,
        categoryId: catMap.get(p.cat)!,
        name: p.name,
        packagingDescription: p.pkg,
        unitsPerPallet: p.units,
        moqPallets: p.moq,
        sampleAvailable: p.sample,
        sampleLeadDays: p.sample ? 5 : null,
        marketStatus: p.market,
        indicativeLow: p.low,
        indicativeMid: p.mid,
        indicativeHigh: p.high,
        indicativeCurrency: "USD",
        originCountry: p.origin,
        certifications: [...p.certs],
        marketInsightSummary: `${p.name} — indicative demand stable in EU retail channels.`,
        supplierCount: 3,
        status: "ACTIVE",
      },
    });
  }
  console.log("  · mixed container catalog:", MC_PRODUCTS.length, "products across", MC_CATEGORIES.length, "categories");

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
          { key: "origin", label: "Origin", type: "enum", required: true, options: ["Turkey", "Ukraine", "Kazakhstan", "EU"] },
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
          { key: "origin", label: "Origin", type: "enum", required: true, options: ["Turkey", "Syria", "Lebanon"] },
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
          { key: "origin", label: "Origin", type: "enum", required: true, options: ["Canada", "Australia", "Turkey", "India"] },
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
          { key: "origin", label: "Origin", type: "enum", required: true, options: ["Turkey", "India", "EU"] },
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
    { code: "PT-MC-PASTA-500G", name: "500g", segment: "RETAIL", unitWeight: 0.5, unitWeightUom: "kg" },
    { code: "PT-MC-PASTA-1KG", name: "1kg", segment: "RETAIL", unitWeight: 1, unitWeightUom: "kg" },
    { code: "PT-MC-PASTA-3KG", name: "3kg", segment: "HORECA", unitWeight: 3, unitWeightUom: "kg" },
    { code: "PT-MC-PASTA-5KG", name: "5kg", segment: "HORECA", unitWeight: 5, unitWeightUom: "kg" },
    { code: "PT-MC-OIL-1L", name: "1L", segment: "RETAIL", unitWeight: 1, unitWeightUom: "L" },
    { code: "PT-MC-OIL-2L", name: "2L", segment: "RETAIL", unitWeight: 2, unitWeightUom: "L" },
    { code: "PT-MC-OIL-3L", name: "3L", segment: "HORECA", unitWeight: 3, unitWeightUom: "L" },
    { code: "PT-MC-OIL-5L", name: "5L", segment: "HORECA", unitWeight: 5, unitWeightUom: "L" },
    { code: "PT-MC-OIL-10L", name: "10L", segment: "INDUSTRIAL", unitWeight: 10, unitWeightUom: "L" },
    { code: "PT-MC-TOMATO-400G", name: "400g", segment: "RETAIL", unitWeight: 0.4, unitWeightUom: "kg" },
    { code: "PT-MC-TOMATO-800G", name: "800g", segment: "RETAIL", unitWeight: 0.8, unitWeightUom: "kg" },
    { code: "PT-MC-TOMATO-1650G", name: "1650g", segment: "HORECA", unitWeight: 1.65, unitWeightUom: "kg" },
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

  const MC_CATEGORY_PACKING: Record<string, { codes: string[]; defaultMatch: RegExp }> = {
    pasta: { codes: ["PT-MC-PASTA-500G", "PT-MC-PASTA-1KG", "PT-MC-PASTA-3KG", "PT-MC-PASTA-5KG"], defaultMatch: /500g|400g/i },
    "sunflower-oil": { codes: ["PT-MC-OIL-1L", "PT-MC-OIL-2L", "PT-MC-OIL-3L", "PT-MC-OIL-5L", "PT-MC-OIL-10L"], defaultMatch: /1L/i },
    "tomato-paste": { codes: ["PT-MC-TOMATO-400G", "PT-MC-TOMATO-800G", "PT-MC-TOMATO-1650G"], defaultMatch: /400g/i },
    pulses: { codes: ["PT-MC-PULSE-500G", "PT-MC-PULSE-1KG", "PT-MC-PULSE-2KG", "PT-MC-PULSE-5KG"], defaultMatch: /25kg|5kg/i },
    flour: { codes: ["PT-MC-PULSE-5KG"], defaultMatch: /25kg/i },
    rice: { codes: ["PT-MC-PULSE-1KG", "PT-MC-PULSE-5KG"], defaultMatch: /5kg|1kg/i },
    biscuits: { codes: ["PT-MC-PASTA-500G"], defaultMatch: /400g/i },
    sugar: { codes: ["PT-MC-PULSE-1KG"], defaultMatch: /1kg/i },
    "canned-food": { codes: ["PT-MC-PASTA-500G"], defaultMatch: /185g|340g/i },
  };

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

  const mcProducts = await prisma.catalogProduct.findMany({ include: { category: true } });
  for (const p of mcProducts) {
    const cfg = MC_CATEGORY_PACKING[p.category.slug];
    if (!cfg) continue;
    const defaultCode =
      cfg.codes.find((c) => {
        const name = PACKING_TYPES.find((x) => x.code === c)?.name ?? "";
        return cfg.defaultMatch.test(p.name) && p.name.toLowerCase().includes(name.toLowerCase().replace("g", "g"));
      }) ??
      cfg.codes.find((c) => cfg.defaultMatch.test(p.name)) ??
      cfg.codes[0];
    await assignPacking("MIXED_CONTAINER", p.id, cfg.codes, defaultCode);
  }

  const bcProducts = await prisma.bulkCatalogProduct.findMany({ include: { category: true } });
  for (const p of bcProducts) {
    const slug = p.category.slug as keyof typeof BULK_CONTAINER_CATEGORY_DEFAULT_PACKING;
    const codes = [...lockedPackingCodesForCategory(slug)];
    const defaultCode = BULK_CONTAINER_CATEGORY_DEFAULT_PACKING[slug];
    if (!codes.length || !defaultCode) continue;
    await assignPacking("BULK_CONTAINER", p.id, codes, defaultCode);
  }

  const fallbackPt = ptMap.get("PT-MC-PASTA-500G")!;
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
