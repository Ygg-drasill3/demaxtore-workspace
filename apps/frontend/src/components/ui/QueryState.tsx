import type { ReactNode } from "react";
import { PageSkeleton, WorkspaceSkeleton } from "@/components/ui/SkeletonLoader";

type Props = {
  isLoading: boolean;
  isError: boolean;
  /** When true, transient refetch errors keep showing cached children. */
  hasData?: boolean;
  onRetry?: () => void;
  errorMessage?: string;
  variant?: "page" | "workspace";
  children: ReactNode;
};

/** Standard loading / error / success gate for React Query pages. */
export function QueryState({
  isLoading,
  isError,
  hasData = false,
  onRetry,
  errorMessage = "Could not load this page.",
  variant = "page",
  children,
}: Props) {
  if (isLoading && !hasData) {
    return variant === "workspace" ? <WorkspaceSkeleton /> : <PageSkeleton />;
  }

  if (isError && !hasData) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center space-y-3" data-testid="query-state-error">
        <p className="text-sm text-red-600">{errorMessage}</p>
        {onRetry ? (
          <button type="button" className="dmx-btn-secondary text-sm" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return <>{children}</>;
}
