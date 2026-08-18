/** Canonical path for an RFQ workspace (slug when available). */
export function rfqWorkspacePath(rfq: { id: string; slug?: string | null }): string {
  const key = rfq.slug?.trim() || rfq.id;
  return `/workspace/rfq/${key}`;
}
