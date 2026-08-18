import { cn } from "@/lib/utils";
import { formatWorkspaceRef } from "@/lib/workspace-ref";

type Props = {
  value: string | null | undefined;
  /** Show muted system id under the friendly label */
  showFull?: boolean;
  className?: string;
  labelClassName?: string;
  fullClassName?: string;
  testId?: string;
};

/** Friendly workspace reference: "Order 0239" with optional full system id. */
export function WorkspaceRef({
  value,
  showFull = false,
  className,
  labelClassName,
  fullClassName,
  testId,
}: Props) {
  const parts = formatWorkspaceRef(value);
  return (
    <span className={cn("inline-flex flex-col min-w-0", className)} data-testid={testId} title={parts.full || undefined}>
      <span className={cn("font-medium text-ink-900 truncate", labelClassName)}>{parts.label}</span>
      {(showFull || parts.detail) && (
        <span className={cn("text-[11px] text-zinc-500 truncate", fullClassName)}>
          {[parts.detail, showFull && parts.full && parts.full !== parts.label ? parts.full : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      )}
    </span>
  );
}
