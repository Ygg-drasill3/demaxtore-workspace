// Sprint 01 — SmartContainer launch taxonomy seed data

export type McPackagingDef = {
  name: string;
  unitsPerPallet: number;
  moqPallets?: number;
  segment?: "RETAIL" | "HORECA" | "INDUSTRIAL";
  unitWeight?: number;
  unitWeightUom?: string;
};

export type McProductDef = {
  ref: string;
  name: string;
  low: number;
  mid: number;
  high: number;
  sample?: boolean;
  market?: "STABLE" | "RISING" | "SHORT";
};

export type McCategoryDef = {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  products: McProductDef[];
  packaging: McPackagingDef[];
};

export const MC_INDUSTRY = {
  slug: "food-beverages",
  name: "Food & Beverages",
} as const;

/** Phase 1 launch categories — Food & Beverages only */
export const MC_LAUNCH_CATEGORIES: McCategoryDef[] = [
  {
    slug: "pasta",
    name: "Pasta",
    description: "Long and short pasta varieties from verified Turkish manufacturers.",
    sortOrder: 1,
    products: [
      { ref: "MC-PASTA-01", name: "Spaghetti", low: 590, mid: 640, high: 690, sample: true },
      { ref: "MC-PASTA-02", name: "Penne Rigate", low: 600, mid: 650, high: 700, sample: true },
      { ref: "MC-PASTA-03", name: "Fusilli", low: 610, mid: 660, high: 710, sample: true },
      { ref: "MC-PASTA-04", name: "Big Elbow", low: 580, mid: 630, high: 680, sample: true },
      { ref: "MC-PASTA-05", name: "Small Elbow", low: 575, mid: 625, high: 675, sample: true },
      { ref: "MC-PASTA-06", name: "Vermicelli", low: 585, mid: 635, high: 685, sample: true },
      { ref: "MC-PASTA-07", name: "Farfalle", low: 620, mid: 670, high: 720, sample: true },
    ],
    packaging: [
      { name: "250 gr", unitsPerPallet: 96, segment: "RETAIL", unitWeight: 0.25, unitWeightUom: "kg" },
      { name: "400 gr", unitsPerPallet: 80, segment: "RETAIL", unitWeight: 0.4, unitWeightUom: "kg" },
      { name: "500 gr", unitsPerPallet: 60, segment: "RETAIL", unitWeight: 0.5, unitWeightUom: "kg" },
      { name: "5 kg", unitsPerPallet: 16, segment: "INDUSTRIAL", unitWeight: 5, unitWeightUom: "kg" },
    ],
  },
  {
    slug: "wheat-flour",
    name: "Wheat Flour",
    description: "All-purpose, pizza, cake flours and semolina from verified Turkish mills.",
    sortOrder: 2,
    products: [
      { ref: "MC-FLOUR-01", name: "All Purpose Flour", low: 480, mid: 520, high: 560, sample: true },
      { ref: "MC-FLOUR-02", name: "Pizza Flour", low: 500, mid: 540, high: 580, sample: true },
      { ref: "MC-FLOUR-03", name: "Cake Flour", low: 510, mid: 550, high: 590, sample: true },
      { ref: "MC-FLOUR-04", name: "Semolina", low: 530, mid: 570, high: 610, sample: true },
    ],
    packaging: [
      { name: "500 gr", unitsPerPallet: 96, segment: "RETAIL", unitWeight: 0.5, unitWeightUom: "kg" },
      { name: "1 kg", unitsPerPallet: 80, segment: "RETAIL", unitWeight: 1, unitWeightUom: "kg" },
      { name: "2 kg", unitsPerPallet: 50, segment: "HORECA", unitWeight: 2, unitWeightUom: "kg" },
      { name: "5 kg", unitsPerPallet: 40, segment: "HORECA", unitWeight: 5, unitWeightUom: "kg" },
    ],
  },
  {
    slug: "tomato-paste",
    name: "Tomato Paste",
    description: "Tomato, pepper, and mixed pastes from verified Turkish manufacturers.",
    sortOrder: 3,
    products: [
      { ref: "MC-TOM-01", name: "Tomato Paste", low: 620, mid: 670, high: 720, sample: true, market: "SHORT" },
      { ref: "MC-TOM-02", name: "Pepper Paste", low: 640, mid: 690, high: 740, sample: true, market: "SHORT" },
      { ref: "MC-TOM-03", name: "Tomato & Pepper Mixed Paste", low: 660, mid: 710, high: 760, sample: true },
    ],
    packaging: [
      { name: "350 gr (jar)", unitsPerPallet: 60, segment: "RETAIL", unitWeight: 0.35, unitWeightUom: "kg" },
      { name: "700 gr (jar)", unitsPerPallet: 40, segment: "RETAIL", unitWeight: 0.7, unitWeightUom: "kg" },
      { name: "830 gr (tin)", unitsPerPallet: 36, segment: "RETAIL", unitWeight: 0.83, unitWeightUom: "kg" },
      { name: "1650 gr (jar)", unitsPerPallet: 24, segment: "HORECA", unitWeight: 1.65, unitWeightUom: "kg" },
      { name: "4350 gr (tin)", unitsPerPallet: 12, segment: "INDUSTRIAL", unitWeight: 4.35, unitWeightUom: "kg" },
    ],
  },
  {
    slug: "sunflower-oil",
    name: "Sunflower Oil",
    description: "Sunflower oil for food service and retail from verified Turkish manufacturers.",
    sortOrder: 4,
    products: [
      { ref: "MC-SFO-01", name: "Sunflower Oil", low: 890, mid: 945, high: 980, sample: true, market: "RISING" },
    ],
    packaging: [
      { name: "700 ml", unitsPerPallet: 72, segment: "RETAIL", unitWeight: 0.7, unitWeightUom: "L" },
      { name: "1 lt", unitsPerPallet: 60, segment: "RETAIL", unitWeight: 1, unitWeightUom: "L" },
      { name: "1.5 lt", unitsPerPallet: 48, segment: "RETAIL", unitWeight: 1.5, unitWeightUom: "L" },
      { name: "1.8 lt", unitsPerPallet: 40, segment: "RETAIL", unitWeight: 1.8, unitWeightUom: "L" },
      { name: "3 lt", unitsPerPallet: 32, segment: "HORECA", unitWeight: 3, unitWeightUom: "L" },
      { name: "4 lt", unitsPerPallet: 28, segment: "HORECA", unitWeight: 4, unitWeightUom: "L" },
      { name: "5 lt", unitsPerPallet: 24, segment: "HORECA", unitWeight: 5, unitWeightUom: "L" },
    ],
  },
  {
    slug: "olive-oil",
    name: "Olive Oil",
    description: "Extra virgin and pomace olive oils from Aegean producers.",
    sortOrder: 5,
    products: [
      { ref: "MC-OLO-01", name: "Extra Virgin Olive Oil", low: 1200, mid: 1280, high: 1360, sample: true },
      { ref: "MC-OLO-02", name: "Pomace Olive Oil", low: 920, mid: 980, high: 1040, sample: true },
    ],
    packaging: [
      { name: "500 ml glass", unitsPerPallet: 72, segment: "RETAIL", unitWeight: 0.5, unitWeightUom: "L" },
      { name: "1 lt glass", unitsPerPallet: 48, segment: "RETAIL", unitWeight: 1, unitWeightUom: "L" },
      { name: "1 lt pet bottle", unitsPerPallet: 60, segment: "RETAIL", unitWeight: 1, unitWeightUom: "L" },
      { name: "3 lt tin", unitsPerPallet: 32, segment: "HORECA", unitWeight: 3, unitWeightUom: "L" },
      { name: "5 lt tin", unitsPerPallet: 20, segment: "HORECA", unitWeight: 5, unitWeightUom: "L" },
      { name: "18 lt tin", unitsPerPallet: 8, segment: "INDUSTRIAL", unitWeight: 18, unitWeightUom: "L" },
    ],
  },
  {
    slug: "pulses",
    name: "Pulses",
    description: "Lentils, chickpeas, beans, and peas for retail and bulk channels.",
    sortOrder: 6,
    products: [
      { ref: "MC-PUL-RL", name: "Red Lentils", low: 780, mid: 820, high: 860, sample: true },
      { ref: "MC-PUL-CH", name: "Chickpeas", low: 800, mid: 840, high: 880, sample: true },
      { ref: "MC-PUL-WB", name: "White Beans", low: 760, mid: 800, high: 840 },
      { ref: "MC-PUL-BE", name: "Black Eyed Peas", low: 740, mid: 780, high: 820 },
      { ref: "MC-PUL-SP", name: "Split Peas", low: 720, mid: 760, high: 800 },
    ],
    packaging: [
      { name: "500 g", unitsPerPallet: 80, segment: "RETAIL", unitWeight: 0.5, unitWeightUom: "kg" },
      { name: "1 kg", unitsPerPallet: 60, segment: "RETAIL", unitWeight: 1, unitWeightUom: "kg" },
      { name: "2 kg", unitsPerPallet: 40, segment: "HORECA", unitWeight: 2, unitWeightUom: "kg" },
      { name: "5 kg", unitsPerPallet: 32, segment: "HORECA", unitWeight: 5, unitWeightUom: "kg" },
    ],
  },
  {
    slug: "pickles",
    name: "Pickles",
    description: "Traditional Turkish pickles in jars, bottles, buckets, and tins.",
    sortOrder: 7,
    products: [
      { ref: "MC-PKL-01", name: "Cucumber Pickle", low: 640, mid: 690, high: 740, sample: true },
      { ref: "MC-PKL-02", name: "Jalapeno Pickle", low: 670, mid: 720, high: 770, sample: true },
      { ref: "MC-PKL-03", name: "Mixed Vegetable Pickle", low: 680, mid: 730, high: 780, sample: true },
      { ref: "MC-PKL-04", name: "Hot Pepper Pickle", low: 700, mid: 750, high: 800, sample: true },
      { ref: "MC-PKL-05", name: "Cabbage Pickle", low: 650, mid: 700, high: 750 },
      { ref: "MC-PKL-06", name: "Gherkins Pickle", low: 660, mid: 710, high: 760, sample: true },
      { ref: "MC-PKL-07", name: "Betroot Pickle", low: 650, mid: 700, high: 750 },
      { ref: "MC-PKL-08", name: "Lombardi Pepper Pickle", low: 710, mid: 760, high: 810 },
      { ref: "MC-PKL-09", name: "Garlic Pickle", low: 690, mid: 740, high: 790 },
    ],
    packaging: [
      { name: "380 gr (Jar)", unitsPerPallet: 96, segment: "RETAIL", unitWeight: 0.38, unitWeightUom: "kg" },
      { name: "700 gr (Jar)", unitsPerPallet: 60, segment: "RETAIL", unitWeight: 0.7, unitWeightUom: "kg" },
      { name: "900 gr (Jar)", unitsPerPallet: 48, segment: "RETAIL", unitWeight: 0.9, unitWeightUom: "kg" },
      { name: "1650 gr (Jar)", unitsPerPallet: 36, segment: "HORECA", unitWeight: 1.65, unitWeightUom: "kg" },
      { name: "3 kg (PET Bottle)", unitsPerPallet: 24, segment: "HORECA", unitWeight: 3, unitWeightUom: "kg" },
      { name: "10 kg (Bucket)", unitsPerPallet: 12, segment: "INDUSTRIAL", unitWeight: 10, unitWeightUom: "kg" },
      { name: "18 kg (Tin)", unitsPerPallet: 8, segment: "INDUSTRIAL", unitWeight: 18, unitWeightUom: "kg" },
    ],
  },
  {
    slug: "fruit-juices",
    name: "Fruit Juices",
    description: "NFC and concentrate-based fruit juices for retail distribution.",
    sortOrder: 8,
    products: [
      { ref: "MC-JUI-ORA", name: "Orange", low: 720, mid: 770, high: 820, sample: true },
      { ref: "MC-JUI-APP", name: "Apple", low: 700, mid: 750, high: 800, sample: true },
      { ref: "MC-JUI-PEA", name: "Peach", low: 710, mid: 760, high: 810, sample: true },
      { ref: "MC-JUI-APR", name: "Apricot", low: 730, mid: 780, high: 830 },
      { ref: "MC-JUI-MIX", name: "Mixed Fruit", low: 690, mid: 740, high: 790 },
      { ref: "MC-JUI-POM", name: "Pomegranate", low: 760, mid: 810, high: 860, sample: true },
    ],
    packaging: [
      { name: "200 ml", unitsPerPallet: 120, segment: "RETAIL", unitWeight: 0.2, unitWeightUom: "L" },
      { name: "330 ml", unitsPerPallet: 96, segment: "RETAIL", unitWeight: 0.33, unitWeightUom: "L" },
      { name: "1 L", unitsPerPallet: 60, segment: "HORECA", unitWeight: 1, unitWeightUom: "L" },
      { name: "2 L", unitsPerPallet: 40, segment: "HORECA", unitWeight: 2, unitWeightUom: "L" },
    ],
  },
  {
    slug: "bulgur",
    name: "Bulgur",
    description: "Coarse, fine, and vermicelli bulgur for pilaf and retail use.",
    sortOrder: 9,
    products: [
      { ref: "MC-BUL-01", name: "Course Bulgur", low: 610, mid: 650, high: 690, sample: true },
      { ref: "MC-BUL-02", name: "Fine Bulgur", low: 620, mid: 660, high: 700, sample: true },
      { ref: "MC-BUL-03", name: "Bulgur with Vermicelli", low: 630, mid: 670, high: 710, sample: true },
    ],
    packaging: [
      { name: "500 gr", unitsPerPallet: 80, segment: "RETAIL", unitWeight: 0.5, unitWeightUom: "kg" },
      { name: "1 kg", unitsPerPallet: 60, segment: "RETAIL", unitWeight: 1, unitWeightUom: "kg" },
      { name: "2 kg", unitsPerPallet: 40, segment: "HORECA", unitWeight: 2, unitWeightUom: "kg" },
      { name: "5 kg", unitsPerPallet: 32, segment: "HORECA", unitWeight: 5, unitWeightUom: "kg" },
    ],
  },
  {
    slug: "grape-leaves",
    name: "Grape Leaves",
    description: "Brined grape leaves for dolma and Mediterranean cuisine.",
    sortOrder: 10,
    products: [
      { ref: "MC-GRL-01", name: "Grape Leaves", low: 850, mid: 900, high: 950, sample: true },
    ],
    packaging: [
      { name: "600 gr (Jar)", unitsPerPallet: 60, segment: "RETAIL", unitWeight: 0.6, unitWeightUom: "kg" },
      { name: "900 gr (Jar)", unitsPerPallet: 48, segment: "RETAIL", unitWeight: 0.9, unitWeightUom: "kg" },
      { name: "1300 gr (PET Bottle)", unitsPerPallet: 36, segment: "HORECA", unitWeight: 1.3, unitWeightUom: "kg" },
      { name: "4600 gr (PET Bottle)", unitsPerPallet: 20, segment: "HORECA", unitWeight: 4.6, unitWeightUom: "kg" },
      { name: "10 kg (Bucket)", unitsPerPallet: 12, segment: "INDUSTRIAL", unitWeight: 10, unitWeightUom: "kg" },
    ],
  },
  {
    slug: "roasted-eggplant",
    name: "Roasted Eggplant",
    description: "Fire-roasted eggplant purée for mezze and food manufacturing.",
    sortOrder: 11,
    products: [
      { ref: "MC-EGG-SMK", name: "Roasted Eggplant", low: 800, mid: 850, high: 900, sample: true },
    ],
    packaging: [
      { name: "700 gr (Jar)", unitsPerPallet: 60, segment: "RETAIL", unitWeight: 0.7, unitWeightUom: "kg" },
      { name: "10 kg (Bucket)", unitsPerPallet: 12, segment: "INDUSTRIAL", unitWeight: 10, unitWeightUom: "kg" },
    ],
  },
  {
    slug: "roasted-red-peppers",
    name: "Roasted Red Peppers",
    description: "Whole, sliced, and diced roasted red peppers in oil or brine.",
    sortOrder: 12,
    products: [
      { ref: "MC-PEP-WHL", name: "Whole Roasted Red Peppers", low: 820, mid: 870, high: 920, sample: true },
    ],
    packaging: [
      { name: "700 gr (Jar)", unitsPerPallet: 60, segment: "RETAIL", unitWeight: 0.7, unitWeightUom: "kg" },
      { name: "10 kg (Bucket)", unitsPerPallet: 12, segment: "INDUSTRIAL", unitWeight: 10, unitWeightUom: "kg" },
    ],
  },
];

/** Retired pre-Sprint-01 categories — hidden from buyer catalog */
export const MC_RETIRED_CATEGORY_SLUGS = ["flour", "rice", "biscuits", "sugar", "canned-food", "fruit-juices"] as const;

export function packagingSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/\s+/g, "-")
    .replace(/\.+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function packingTypeCode(categorySlug: string, pkgName: string): string {
  const base = packagingSlug(pkgName).replace(/-/g, "").toUpperCase();
  return `PT-MC-${categorySlug.replace(/-/g, "").toUpperCase().slice(0, 8)}-${base}`.slice(0, 48);
}
