import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { fetchAuthenticatedBlob, downloadAuthenticatedDocument } from "@/lib/authenticated-file";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n/useT";

function mimeFromFileName(fileName: string, mimeType?: string): string {
  if (mimeType) return mimeType;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    txt: "text/plain",
    csv: "text/csv",
  };
  return map[ext] ?? "application/octet-stream";
}

function isPreviewable(mime: string): boolean {
  return mime === "application/pdf" || mime.startsWith("image/") || mime.startsWith("text/");
}

type Props = {
  url: string;
  fileName: string;
  mimeType?: string;
  className?: string;
  testId?: string;
};

export function DocumentPreview({ url, fileName, mimeType, className = "", testId = "document-preview" }: Props) {
  const { t } = useT();
  const mime = useMemo(() => mimeFromFileName(fileName, mimeType), [fileName, mimeType]);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    setBlobUrl(null);
    setTextContent(null);

    fetchAuthenticatedBlob(url, { signal: ac.signal })
      .then(async (blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        if (mime.startsWith("text/") && blob.size < 512_000) {
          setTextContent(await blob.text());
        }
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        setError(t("documents.preview.failed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      ac.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, mime, t]);

  if (loading) {
    return (
      <div data-testid={`${testId}-loading`} className={`flex items-center justify-center p-16 text-zinc-500 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div data-testid={`${testId}-error`} className={`flex flex-col items-center justify-center gap-3 p-10 text-center ${className}`}>
        <FileText className="h-10 w-10 text-zinc-400" />
        <p className="text-sm text-zinc-600">{error ?? t("documents.preview.unavailable")}</p>
        <Button size="sm" variant="secondary" onClick={() => void downloadAuthenticatedDocument(url, fileName)}>
          <Download className="h-3.5 w-3.5" /> {t("documents.download")}
        </Button>
      </div>
    );
  }

  if (!isPreviewable(mime)) {
    return (
      <div data-testid={`${testId}-unsupported`} className={`flex flex-col items-center justify-center gap-3 p-10 text-center ${className}`}>
        <FileText className="h-10 w-10 text-zinc-400" />
        <p className="text-sm text-zinc-600">{t("documents.preview.unsupported")}</p>
        <Button size="sm" variant="secondary" onClick={() => void downloadAuthenticatedDocument(url, fileName)}>
          <Download className="h-3.5 w-3.5" /> {t("documents.download")}
        </Button>
      </div>
    );
  }

  if (mime.startsWith("image/")) {
    return (
      <div data-testid={testId} className={`flex items-center justify-center bg-zinc-50 rounded-lg overflow-auto max-h-[70vh] ${className}`}>
        <img src={blobUrl} alt={fileName} className="max-w-full max-h-[70vh] object-contain" />
      </div>
    );
  }

  if (mime.startsWith("text/") && textContent != null) {
    return (
      <pre
        data-testid={testId}
        className={`rounded-lg border border-zinc-200 bg-white p-4 text-xs overflow-auto max-h-[70vh] whitespace-pre-wrap ${className}`}
      >
        {textContent}
      </pre>
    );
  }

  return (
    <iframe
      data-testid={testId}
      title={fileName}
      src={blobUrl}
      className={`w-full h-[70vh] rounded-lg border border-zinc-200 bg-white ${className}`}
    />
  );
}
