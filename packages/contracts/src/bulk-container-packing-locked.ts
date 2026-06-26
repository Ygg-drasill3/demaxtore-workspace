// Sprint 13B.1 → 13C bridge — LOCKED BulkContainer packing catalog
// Do not change without a formal catalog version bump.
// Pricing, offers, and supplier matching in 13C+ depend on these stable codes.

export const BULK_CONTAINER_PACKING_CATALOG_VERSION = "1.0" as const;

export type BulkContainerCategorySlug =
  | "wheat-flour"
  | "semolina"
  | "bulgur"
  | "pulses"
  | "salt"
  | "pasta";

export interface LockedBulkPackingType {
  code: string;
  name: string;
  segment: "HORECA" | "INDUSTRIAL";
  unitWeight: number;
  unitWeightUom: "kg";
  categorySlug: BulkContainerCategorySlug;
}

/** Canonical locked packing types — single source of truth for seed, API guards, and 13C pricing. */
export const BULK_CONTAINER_LOCKED_PACKING_TYPES = [
  { code: "PT-BC-FLOUR-25KG", name: "25kg Bag", segment: "HORECA", unitWeight: 25, unitWeightUom: "kg", categorySlug: "wheat-flour" },
  { code: "PT-BC-FLOUR-50KG", name: "50kg Bag", segment: "INDUSTRIAL", unitWeight: 50, unitWeightUom: "kg", categorySlug: "wheat-flour" },
  { code: "PT-BC-SEMOLINA-25KG", name: "25kg Bag", segment: "HORECA", unitWeight: 25, unitWeightUom: "kg", categorySlug: "semolina" },
  { code: "PT-BC-SEMOLINA-50KG", name: "50kg Bag", segment: "INDUSTRIAL", unitWeight: 50, unitWeightUom: "kg", categorySlug: "semolina" },
  { code: "PT-BC-BULGUR-25KG", name: "25kg Bag", segment: "HORECA", unitWeight: 25, unitWeightUom: "kg", categorySlug: "bulgur" },
  { code: "PT-BC-BULGUR-50KG", name: "50kg Bag", segment: "INDUSTRIAL", unitWeight: 50, unitWeightUom: "kg", categorySlug: "bulgur" },
  { code: "PT-BC-PULSE-25KG", name: "25kg Bag", segment: "HORECA", unitWeight: 25, unitWeightUom: "kg", categorySlug: "pulses" },
  { code: "PT-BC-PULSE-50KG", name: "50kg Bag", segment: "INDUSTRIAL", unitWeight: 50, unitWeightUom: "kg", categorySlug: "pulses" },
  { code: "PT-BC-SALT-25KG", name: "25kg Bag", segment: "HORECA", unitWeight: 25, unitWeightUom: "kg", categorySlug: "salt" },
  { code: "PT-BC-SALT-50KG", name: "50kg Bag", segment: "INDUSTRIAL", unitWeight: 50, unitWeightUom: "kg", categorySlug: "salt" },
  { code: "PT-BC-SALT-1000KG", name: "1000kg Big Bag", segment: "INDUSTRIAL", unitWeight: 1000, unitWeightUom: "kg", categorySlug: "salt" },
  { code: "PT-BC-PASTA-5KG", name: "5kg", segment: "HORECA", unitWeight: 5, unitWeightUom: "kg", categorySlug: "pasta" },
  { code: "PT-BC-PASTA-10KG", name: "10kg", segment: "HORECA", unitWeight: 10, unitWeightUom: "kg", categorySlug: "pasta" },
  { code: "PT-BC-PASTA-20KG", name: "20kg", segment: "HORECA", unitWeight: 20, unitWeightUom: "kg", categorySlug: "pasta" },
  { code: "PT-BC-PASTA-25KG", name: "25kg", segment: "INDUSTRIAL", unitWeight: 25, unitWeightUom: "kg", categorySlug: "pasta" },
] as const satisfies readonly LockedBulkPackingType[];

export const BULK_CONTAINER_LOCKED_PACKING_CODES: Set<string> = new Set(
  BULK_CONTAINER_LOCKED_PACKING_TYPES.map((p) => p.code),
);

/** Default packing code per BulkContainer category slug. */
export const BULK_CONTAINER_CATEGORY_DEFAULT_PACKING: Record<BulkContainerCategorySlug, string> = {
  "wheat-flour": "PT-BC-FLOUR-50KG",
  semolina: "PT-BC-SEMOLINA-25KG",
  bulgur: "PT-BC-BULGUR-25KG",
  pulses: "PT-BC-PULSE-25KG",
  salt: "PT-BC-SALT-25KG",
  pasta: "PT-BC-PASTA-25KG",
};

export function lockedPackingCodesForCategory(slug: string): readonly string[] {
  return BULK_CONTAINER_LOCKED_PACKING_TYPES
    .filter((p) => p.categorySlug === slug)
    .map((p) => p.code);
}

export function isLockedBulkContainerPackingCode(code: string): boolean {
  return BULK_CONTAINER_LOCKED_PACKING_CODES.has(code);
}

export function isBulkContainerPackingPrefix(code: string): boolean {
  return code.startsWith("PT-BC-");
}

/** Throws-compatible guard result — returns error message or null if valid. */
export function validateBulkContainerPackingAssignment(
  categorySlug: string,
  packingCode: string,
): string | null {
  if (!isLockedBulkContainerPackingCode(packingCode)) {
    return `Packing type ${packingCode} is not in the locked BulkContainer catalog (v${BULK_CONTAINER_PACKING_CATALOG_VERSION}).`;
  }
  const allowed = lockedPackingCodesForCategory(categorySlug);
  if (!allowed.includes(packingCode)) {
    return `Packing type ${packingCode} is not valid for BulkContainer category ${categorySlug}.`;
  }
  return null;
}
