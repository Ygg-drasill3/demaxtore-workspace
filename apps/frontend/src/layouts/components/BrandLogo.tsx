// apps/frontend/src/layouts/components/BrandLogo.tsx
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Compact mark for collapsed sidebar */
  compact?: boolean;
};

/** DeMaxtore Workspace wordmark — designed for dark surfaces. */
export function BrandLogo({ className, compact }: BrandLogoProps) {
  return (
    <img
      src="/demaxtore-logo.png"
      alt="DeMaxtore Workspace"
      className={cn(
        "object-contain object-left",
        compact ? "h-9 w-auto max-w-[44px]" : "h-10 w-auto max-w-[168px]",
        className,
      )}
      draggable={false}
    />
  );
}
