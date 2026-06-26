/** True when no open freight request blocks shipment booking, or a forwarder offer was selected. */
export function isFreightOfferSelected(
  freightRequests?: Array<{ status: string; selection?: unknown | null }> | null,
): boolean {
  const open = (freightRequests ?? []).find((r) => !["CANCELLED", "EXPIRED"].includes(r.status));
  if (!open) return true;
  if (open.status === "CONVERTED_TO_SHIPMENT" || open.selection) return true;
  return false;
}
