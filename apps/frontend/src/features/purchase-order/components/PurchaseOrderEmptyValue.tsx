import { emptyValue } from "../lib/purchase-order.formatters";

/** Shared empty-value presentation for Purchase Order workspace fields. */
export function PurchaseOrderEmptyValue({
  value,
  testId,
}: {
  value: string | number | null | undefined;
  testId?: string;
}) {
  const display = emptyValue(value);
  const isEmpty = display === "Not specified";
  return (
    <span
      data-testid={testId}
      className={isEmpty ? "text-zinc-400" : undefined}
    >
      {display}
    </span>
  );
}
