import { useEffect, useState } from "react";
import { fetchAuthenticatedBlob } from "@/lib/authenticated-file";
import { cn } from "@/lib/utils";

/** Fixed logo slot — every supplier uses the same bounding box on quotation cards. */
export const SUPPLIER_LOGO_BOX_CLASS =
  "shrink-0 h-16 w-32 sm:h-16 sm:w-32 flex items-center justify-center overflow-hidden";

type Props = {
  logoUrl?: string | null;
  supplierName?: string | null;
  className?: string;
};

/** Loads supplier logo via authenticated API (plain img src cannot send auth headers). */
export function SupplierLogoAvatar({ logoUrl, supplierName, className }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!logoUrl) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    void fetchAuthenticatedBlob(logoUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [logoUrl]);

  const initial = (supplierName || "?").trim().charAt(0).toUpperCase();

  return (
    <div className={cn(SUPPLIER_LOGO_BOX_CLASS, className)}>
      {preview ? (
        <img
          src={preview}
          alt=""
          className="h-full w-full object-contain object-center"
        />
      ) : (
        <span className="text-2xl font-semibold text-zinc-400 uppercase" aria-hidden>
          {initial}
        </span>
      )}
    </div>
  );
}
