// =============================================================================
// @dmx/contracts — Buyer commercial operating model (presentation segmentation)
// =============================================================================
// Organisation-level commercial profile. Controls dashboard / nav / onboarding
// composition. Does NOT replace authorization and is independent of shipment
// destination (Turkey customs eligibility).
import { z } from "zod";

export const BUYER_OPERATING_MODELS = ["INTERNATIONAL", "TURKEY_IMPORTER"] as const;
export type BuyerOperatingModel = (typeof BUYER_OPERATING_MODELS)[number];

export const BuyerOperatingModelEnum = z.enum(BUYER_OPERATING_MODELS);

export const DEFAULT_BUYER_OPERATING_MODEL: BuyerOperatingModel = "INTERNATIONAL";

/** Unknown / missing / non-buyer values resolve to International (safe default). */
export function resolveBuyerOperatingModel(
  value: string | null | undefined,
): BuyerOperatingModel {
  return value === "TURKEY_IMPORTER" ? "TURKEY_IMPORTER" : DEFAULT_BUYER_OPERATING_MODEL;
}

export function isTurkeyImporterOperatingModel(
  value: string | null | undefined,
): boolean {
  return resolveBuyerOperatingModel(value) === "TURKEY_IMPORTER";
}
