import type { Prisma } from "@prisma/client";
import type { FreightMargin } from "@dmx/contracts/freight-commercial";

export function computeDisplayPrice(internalCostUsd: number, freightiqMarginUsd: number): number {
  return Math.round((internalCostUsd + freightiqMarginUsd) * 100) / 100;
}

export function resolveIntakeCommercial(input: {
  internalCostUsd?: number;
  oceanFreight?: number;
  freightiqMarginUsd?: number;
}): { internalCostUsd: number; freightiqMarginUsd: number; displayPriceUsd: number } {
  const internalCostUsd = input.internalCostUsd ?? input.oceanFreight ?? 0;
  const freightiqMarginUsd = input.freightiqMarginUsd ?? 0;
  if (internalCostUsd <= 0) throw new Error("INVALID_INTERNAL_COST");
  const displayPriceUsd = computeDisplayPrice(internalCostUsd, freightiqMarginUsd);
  return { internalCostUsd, freightiqMarginUsd, displayPriceUsd };
}

export function commercialFromOffer(o: {
  internalCostUsd: Prisma.Decimal | null;
  freightiqMarginUsd: Prisma.Decimal;
  displayPriceUsd: Prisma.Decimal | null;
  price: Prisma.Decimal;
  marginLockedAt: Date | null;
  marginLockedBy: string | null;
}): FreightMargin {
  const internal = Number(o.internalCostUsd ?? o.price);
  const margin = Number(o.freightiqMarginUsd);
  const display = Number(o.displayPriceUsd ?? o.price);
  return {
    internalCostUsd: internal,
    freightiqMarginUsd: margin,
    displayPriceUsd: display,
    marginLockedAt: o.marginLockedAt?.toISOString() ?? null,
    marginLockedBy: o.marginLockedBy,
  };
}

export function displayPriceForOffer(o: {
  displayPriceUsd?: Prisma.Decimal | null;
  price: Prisma.Decimal;
}): number {
  return Number(o.displayPriceUsd ?? o.price);
}
