import { useEffect, useState } from "react";
import { whatsappInboxApi } from "../lib/whatsapp-inbox.api";

export function WhatsAppMediaImage({
  messageId,
  alt,
  className,
}: {
  messageId: string;
  alt?: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void whatsappInboxApi.fetchMediaBlob(messageId).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [messageId]);

  if (!src) return <div className="text-xs text-zinc-400 py-2">Medya yükleniyor…</div>;
  return <img src={src} alt={alt ?? "media"} className={className} />;
}
