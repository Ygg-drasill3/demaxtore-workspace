import { useState } from "react";
import { FolderOpen } from "lucide-react";
import type { AttachmentLibrary } from "@dmx/contracts/conversation-hub";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import { formatWhen } from "../lib/conversation-hub.utils";
import AttachmentDownloadButton from "./AttachmentDownloadButton";

interface Props {
  library: AttachmentLibrary;
  workspaceType: CommWorkspaceType;
  workspaceId: string;
}

export default function AttachmentLibraryPanel({ library, workspaceType, workspaceId }: Props) {
  const [open, setOpen] = useState<string | null>(library.categories[0]?.category ?? null);

  if (library.totalCount === 0) {
    return (
      <section data-testid="hub-attachment-library" className="text-xs text-zinc-500">
        No documents in this conversation yet.
      </section>
    );
  }

  return (
    <section data-testid="hub-attachment-library" className="space-y-2">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-blue-700" />
        <h4 className="text-sm font-medium text-zinc-900">Attachment Library</h4>
        <span className="text-xs text-zinc-500">({library.totalCount})</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {library.categories.map((cat) => (
          <button
            key={cat.category}
            type="button"
            data-testid={`hub-lib-cat-${cat.category}`}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${
              open === cat.category
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300"
            }`}
            onClick={() => setOpen(open === cat.category ? null : cat.category)}
          >
            {cat.label} ({cat.items.length})
          </button>
        ))}
      </div>
      {open && (
        <ul className="rounded-lg border border-zinc-100 divide-y divide-zinc-50 max-h-48 overflow-auto">
          {library.categories
            .find((c) => c.category === open)
            ?.items.map((item) => (
              <li
                key={item.id}
                data-testid={`hub-lib-item-${item.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50"
              >
                <AttachmentDownloadButton
                  workspaceType={workspaceType}
                  workspaceId={workspaceId}
                  attachmentId={item.id}
                  fileName={item.fileName}
                  mimeType={item.mimeType}
                  fileSizeBytes={item.fileSizeBytes}
                  testId={`hub-lib-download-${item.id}`}
                />
                <p className="text-[10px] text-zinc-400 sm:ml-auto">
                  {item.uploadedBy ?? "Unknown"} · {formatWhen(item.uploadedAt)}
                </p>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
