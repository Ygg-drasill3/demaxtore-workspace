export declare const BULK_CONTAINER_PACKING_CATALOG_VERSION: "1.0";
export type BulkContainerCategorySlug = "wheat-flour" | "semolina" | "bulgur" | "pulses" | "salt" | "pasta";
export interface LockedBulkPackingType {
    code: string;
    name: string;
    segment: "HORECA" | "INDUSTRIAL";
    unitWeight: number;
    unitWeightUom: "kg";
    categorySlug: BulkContainerCategorySlug;
}
/** Canonical locked packing types — single source of truth for seed, API guards, and 13C pricing. */
export declare const BULK_CONTAINER_LOCKED_PACKING_TYPES: readonly [{
    readonly code: "PT-BC-FLOUR-25KG";
    readonly name: "25kg Bag";
    readonly segment: "HORECA";
    readonly unitWeight: 25;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "wheat-flour";
}, {
    readonly code: "PT-BC-FLOUR-50KG";
    readonly name: "50kg Bag";
    readonly segment: "INDUSTRIAL";
    readonly unitWeight: 50;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "wheat-flour";
}, {
    readonly code: "PT-BC-SEMOLINA-25KG";
    readonly name: "25kg Bag";
    readonly segment: "HORECA";
    readonly unitWeight: 25;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "semolina";
}, {
    readonly code: "PT-BC-SEMOLINA-50KG";
    readonly name: "50kg Bag";
    readonly segment: "INDUSTRIAL";
    readonly unitWeight: 50;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "semolina";
}, {
    readonly code: "PT-BC-BULGUR-25KG";
    readonly name: "25kg Bag";
    readonly segment: "HORECA";
    readonly unitWeight: 25;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "bulgur";
}, {
    readonly code: "PT-BC-BULGUR-50KG";
    readonly name: "50kg Bag";
    readonly segment: "INDUSTRIAL";
    readonly unitWeight: 50;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "bulgur";
}, {
    readonly code: "PT-BC-PULSE-25KG";
    readonly name: "25kg Bag";
    readonly segment: "HORECA";
    readonly unitWeight: 25;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "pulses";
}, {
    readonly code: "PT-BC-PULSE-50KG";
    readonly name: "50kg Bag";
    readonly segment: "INDUSTRIAL";
    readonly unitWeight: 50;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "pulses";
}, {
    readonly code: "PT-BC-SALT-25KG";
    readonly name: "25kg Bag";
    readonly segment: "HORECA";
    readonly unitWeight: 25;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "salt";
}, {
    readonly code: "PT-BC-SALT-50KG";
    readonly name: "50kg Bag";
    readonly segment: "INDUSTRIAL";
    readonly unitWeight: 50;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "salt";
}, {
    readonly code: "PT-BC-SALT-1000KG";
    readonly name: "1000kg Big Bag";
    readonly segment: "INDUSTRIAL";
    readonly unitWeight: 1000;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "salt";
}, {
    readonly code: "PT-BC-PASTA-5KG";
    readonly name: "5kg";
    readonly segment: "HORECA";
    readonly unitWeight: 5;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "pasta";
}, {
    readonly code: "PT-BC-PASTA-10KG";
    readonly name: "10kg";
    readonly segment: "HORECA";
    readonly unitWeight: 10;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "pasta";
}, {
    readonly code: "PT-BC-PASTA-20KG";
    readonly name: "20kg";
    readonly segment: "HORECA";
    readonly unitWeight: 20;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "pasta";
}, {
    readonly code: "PT-BC-PASTA-25KG";
    readonly name: "25kg";
    readonly segment: "INDUSTRIAL";
    readonly unitWeight: 25;
    readonly unitWeightUom: "kg";
    readonly categorySlug: "pasta";
}];
export declare const BULK_CONTAINER_LOCKED_PACKING_CODES: Set<string>;
/** Default packing code per BulkContainer category slug. */
export declare const BULK_CONTAINER_CATEGORY_DEFAULT_PACKING: Record<BulkContainerCategorySlug, string>;
export declare function lockedPackingCodesForCategory(slug: string): readonly string[];
export declare function isLockedBulkContainerPackingCode(code: string): boolean;
export declare function isBulkContainerPackingPrefix(code: string): boolean;
/** Throws-compatible guard result — returns error message or null if valid. */
export declare function validateBulkContainerPackingAssignment(categorySlug: string, packingCode: string): string | null;
