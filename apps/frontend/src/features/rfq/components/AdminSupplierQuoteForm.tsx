// Admin enters a supplier quotation on behalf of an assigned counterparty.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserCog } from "lucide-react";
import { useRfqWorkspace } from "../hooks";
import { rfqApi } from "../lib/rfq.api";
import { SupplierQuoteForm } from "./SupplierQuoteForm";
import type { RfqParticipantDTO } from "@dmx/contracts/rfq-participants";

interface Props {
  workspaceId: string;
  currency: string;
  defaultIncoterm?: string;
  rfqLineItems: Array<{ id: string; position: number; description: string; quantity: number; uom: string }>;
}

export function AdminSupplierQuoteForm({
  workspaceId,
  currency,
  defaultIncoterm,
  rfqLineItems,
}: Props) {
  const { data: rfq } = useRfqWorkspace(workspaceId);
  const participants = ((rfq as { participants?: RfqParticipantDTO[] } | undefined)?.participants) ?? [];
  const assignedSuppliers = useMemo(
    () => participants.filter((p) => p.participantRole === "COUNTERPARTY"),
    [participants],
  );

  const [supplierId, setSupplierId] = useState("");

  const scope = useQuery({
    queryKey: ["rfq", workspaceId, "admin-quote-scope", supplierId],
    queryFn: () => rfqApi.getSupplierQuoteScope(workspaceId, supplierId),
    enabled: !!supplierId,
    staleTime: 30_000,
  });

  const selectedSupplier = assignedSuppliers.find((s) => s.userId === supplierId);

  return (
    <section
      data-testid="admin-supplier-quote-panel"
      className="bg-white border border-indigo-200 rounded-2xl shadow-sm overflow-hidden"
    >
      <header className="px-5 pt-5 sm:px-6 sm:pt-6 border-b border-indigo-100 bg-indigo-50/60">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-100 text-indigo-800 grid place-items-center shrink-0">
            <UserCog className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              Submit quotation on behalf of supplier
            </h2>
            <p className="text-sm text-zinc-600 mt-1">
              Select an assigned supplier and enter their offer. It will appear under their name in the comparison.
            </p>
          </div>
        </div>

        <div className="mt-4 pb-5 max-w-md">
          <label htmlFor="admin-quote-supplier" className="text-[11px] uppercase tracking-wider text-zinc-500">
            Supplier
          </label>
          <select
            id="admin-quote-supplier"
            data-testid="admin-quote-supplier-select"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-paper-200 bg-white px-3 text-sm text-ink-900 focus:border-accent-900 focus:outline-none focus:ring-2 focus:ring-accent-900/15"
          >
            <option value="">Choose supplier…</option>
            {assignedSuppliers.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.name}
                {s.email ? ` (${s.email})` : ""}
              </option>
            ))}
          </select>
          {!assignedSuppliers.length && (
            <p className="text-xs text-amber-800 mt-2">
              No suppliers assigned yet. Assign suppliers before entering a quote on their behalf.
            </p>
          )}
        </div>
      </header>

      {supplierId && selectedSupplier && !scope.isLoading && (
        <div className="border-t border-paper-100">
          {(scope.data?.remainingQuoteLineItemIds?.length ?? scope.data?.allowedQuoteLineItemIds?.length ?? 1) > 0 ? (
            <SupplierQuoteForm
              key={`${supplierId}-${scope.data?.remainingQuoteLineItemIds?.join(",") ?? "all"}`}
              workspaceId={workspaceId}
              currency={currency}
              defaultIncoterm={defaultIncoterm}
              rfqLineItems={rfqLineItems}
              allowedQuoteLineItemIds={
                scope.data?.remainingQuoteLineItemIds ?? scope.data?.allowedQuoteLineItemIds
              }
              appendToQuotationId={
                scope.data?.existingQuotationId && scope.data?.remainingQuoteLineItemIds?.length
                  ? scope.data.existingQuotationId
                  : undefined
              }
              onBehalfOfSupplierId={supplierId}
              onBehalfOfSupplierName={selectedSupplier.name}
              embedded
            />
          ) : (
            <p className="px-5 py-6 text-sm text-zinc-600">
              This supplier has already submitted quotes for all assigned products.
            </p>
          )}
        </div>
      )}

      {supplierId && scope.isLoading && (
        <p className="px-5 py-6 text-sm text-zinc-500">Loading supplier quote scope…</p>
      )}
    </section>
  );
}
