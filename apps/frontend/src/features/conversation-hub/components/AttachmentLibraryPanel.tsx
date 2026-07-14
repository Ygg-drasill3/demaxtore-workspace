import { useState } from "react";
import { FileText, Image, Film, FolderOpen } from "lucide-react";
import type { AttachmentLibrary } from "@dmx/contracts/conversation-hub";
import { formatWhen } from "../lib/conversation-hub.utils";

interface Props {
  library: AttachmentLibrary;
}

function categoryIcon(category: string) {
  if (category === "PHOTO") return Image;
  if (category === "VIDEO") return Film;
  return FileText;
}

export default function AttachmentLibraryPanel({ library }: Props) {
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
            ?.items.map((item) => {
              const Icon = categoryIcon(item.category);
              return (
                <li
                  key={item.id}
                  data-testid={`hub-lib-item-${item.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  <Icon className="h-4 w-4 text-blue-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-800">{item.fileName}</p>
                    <p className="text-[10px] text-zinc-400">
                      {item.uploadedBy ?? "Unknown"} · {formatWhen(item.uploadedAt)}
                    </p>
                  </div>
                </li>
              );
            })}
        </ul>
      )}
    </section>
  );
}
