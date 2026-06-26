/** FreightIQ Messages panel path — optional RFQ context opens that conversation. */
export function freightiqMessagesPath(rfqId?: string | null): string {
  if (!rfqId?.trim()) return "/messages";
  const params = new URLSearchParams({ rfqId: rfqId.trim() });
  return `/messages?${params.toString()}`;
}
