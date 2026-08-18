import type { PackingTypeSummaryDTO } from "./packing-type.js";
export declare const CATALOG_MARKET_STATUS: readonly ["STABLE", "RISING", "SHORT"];
export type CatalogMarketStatus = (typeof CATALOG_MARKET_STATUS)[number];
export declare const CATALOG_PRODUCT_STATUS: readonly ["ACTIVE", "DISCONTINUED"];
export type CatalogProductStatus = (typeof CATALOG_PRODUCT_STATUS)[number];
export declare const MC_CONTAINER_TYPES: readonly ["CONTAINER_20FT", "CONTAINER_40FT", "CONTAINER_40FT_HC"];
export type McContainerType = (typeof MC_CONTAINER_TYPES)[number];
export interface CatalogIndustryDTO {
    id: string;
    slug: string;
    name: string;
    categoryCount: number;
}
export interface CatalogCategoryDTO {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    industrySlug: string;
    industryName: string;
    productCount: number;
}
export interface CatalogPackagingDTO {
    id: string;
    slug: string;
    name: string;
    unitsPerPallet: number;
    moqPallets: number;
    isDefault: boolean;
    /** @deprecated use packaging options; kept for container-line compatibility */
    packingTypeId?: string | null;
}
/** Buyer discovery view — no pricing or supplier information */
export interface CatalogProductDiscoveryDTO {
    id: string;
    productRef: string;
    name: string;
    shortDescription: string | null;
    category: string;
    categorySlug: string;
    originCountry: string | null;
    packagingOptions: CatalogPackagingDTO[];
    imageUrl: string | null;
    moqPallets: number;
}
export interface CatalogProductDetailDTO extends CatalogProductDiscoveryDTO {
    description: string | null;
}
export interface CatalogProductCardDTO {
    id: string;
    productRef: string;
    name: string;
    category: string;
    categorySlug: string;
    industrySlug: string;
    industryName: string;
    packagingDescription: string;
    moqPallets: number;
    unitsPerPallet: number;
    palletWeightKg: number | null;
    sampleAvailable: boolean;
    sampleLeadDays: number | null;
    marketStatus: CatalogMarketStatus;
    indicativeLow: number | null;
    indicativeMid: number | null;
    indicativeHigh: number | null;
    indicativeCurrency: string;
    originCountry: string | null;
    certifications: string[];
    supplierAvailabilityLabel: string;
    packagingOptions: CatalogPackagingDTO[];
    /** @deprecated use packagingOptions */
    packingTypes: PackingTypeSummaryDTO[];
    imageUrl: string | null;
    updatedAt: string;
}
export interface CatalogListQuery {
    industry?: string;
    category?: string;
    sampleAvailable?: boolean;
    certification?: string;
    marketStatus?: CatalogMarketStatus;
    originCountry?: string;
    q?: string;
    page?: number;
    limit?: number;
}
