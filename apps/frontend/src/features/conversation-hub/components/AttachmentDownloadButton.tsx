import { useState, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import { conversationHubApi } from "../lib/conversation-hub.api";
import { downloadAuthenticatedDocument } from "@/lib/authenticated-file";
import { toast } from "@/store/toast.store";

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  workspaceType: CommWorkspaceType;
  workspaceId: string;
  attachmentId: string;
  fileName: string;
  mimeType?: string;
  fileSizeBytes?: number;
  downloadUrl?: string;
  className?: string;
  testId?: string;
}

export default function AttachmentDownloadButton({
  workspaceType,
  workspaceId,
  attachmentId,
  fileName,
  mimeType,
  fileSizeBytes,
  downloadUrl: downloadUrlProp,
  className = "",
  testId,
}: Props) {
  const [loading, setLoading] = useState(false);

  const onDownload = useCallback(async () => {
    if (loading || !attachmentId || !fileName) return;
    setLoading(true);
    try {
      const url =
        downloadUrlProp ??
        conversationHubApi.downloadUrl(workspaceType, workspaceId, attachmentId);
      await downloadAuthenticatedDocument(url, fileName);
    } catch {
      toast.error("Ek indirilemedi");
    } finally {
      setLoading(false);
    }
  }, [loading, downloadUrlProp, workspaceType, workspaceId, attachmentId, fileName]);

  if (!attachmentId || !fileName) return null;

  const sizeLabel = formatBytes(fileSizeBytes);

  return (
    <button
      type="button"
      data-testid={testId ?? `hub-attachment-download-${attachmentId}`}
      disabled={loading}
      onClick={() => void onDownload()}
      className={[
        "inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded",
        "hover:bg-blue-200/70 transition-colors disabled:opacity-60",
        className,
      ].join(" ")}
      title={mimeType ? `${fileName} (${mimeType})` : fileName}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
      <span className="truncate max-w-[200px]">{fileName}</span>
      {sizeLabel && <span className="text-[10px] text-blue-500/80 shrink-0">{sizeLabel}</span>}
    </button>
  );
}
