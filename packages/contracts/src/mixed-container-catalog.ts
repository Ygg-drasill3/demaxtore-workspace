// Sprint 12B — Mixed Container catalog contracts (buyer-safe DTOs)

import type { PackingTypeSummaryDTO } from "./packing-type.js";

export const CATALOG_MARKET_STATUS = ["STABLE", "RISING", "SHORT"] as const;
export type CatalogMarketStatus = (typeof CATALOG_MARKET_STATUS)[number];

export const CATALOG_PRODUCT_STATUS = ["ACTIVE", "DISCONTINUED"] as const;
export type CatalogProductStatus = (typeof CATALOG_PRODUCT_STATUS)[number];

export const MC_CONTAINER_TYPES = ["CONTAINER_20FT", "CONTAINER_40FT", "CONTAINER_40FT_HC"] as const;
export type McContainerType = (typeof MC_CONTAINER_TYPES)[number];

export interface CatalogCategoryDTO {
  id: string;
  slug: string;
  name: string;
  productCount: number;
}

export interface CatalogProductCardDTO {
  id: string;
  productRef: string;
  name: string;
  category: string;
  categorySlug: string;
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
  packingTypes: PackingTypeSummaryDTO[];
  imageUrl: string | null;
  updatedAt: string;
}

export interface CatalogProductDetailDTO extends CatalogProductCardDTO {
  marketInsightSummary: string | null;
}

export interface CatalogListQuery {
  category?: string;
  sampleAvailable?: boolean;
  certification?: string;
  marketStatus?: CatalogMarketStatus;
  originCountry?: string;
  q?: string;
  page?: number;
  limit?: number;
}
