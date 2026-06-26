/** Production progress must reach 100% before order advances past production. */
export const PRODUCTION_COMPLETE_PERCENT = 100;

export function isProductionCompletePercent(value: unknown): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n >= PRODUCTION_COMPLETE_PERCENT;
}
