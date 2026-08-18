import { z } from "zod";
export declare const BUYER_OPERATING_MODELS: readonly ["INTERNATIONAL", "TURKEY_IMPORTER"];
export type BuyerOperatingModel = (typeof BUYER_OPERATING_MODELS)[number];
export declare const BuyerOperatingModelEnum: z.ZodEnum<["INTERNATIONAL", "TURKEY_IMPORTER"]>;
export declare const DEFAULT_BUYER_OPERATING_MODEL: BuyerOperatingModel;
/** Unknown / missing / non-buyer values resolve to International (safe default). */
export declare function resolveBuyerOperatingModel(value: string | null | undefined): BuyerOperatingModel;
export declare function isTurkeyImporterOperatingModel(value: string | null | undefined): boolean;
