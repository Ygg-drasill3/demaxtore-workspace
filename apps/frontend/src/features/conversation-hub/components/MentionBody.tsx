import type { ReactNode } from "react";

const ROLE_PATTERN = /(@Buyer|@Supplier|@DeMaxtore)/gi;

export function MentionBody({ text }: { text: string }) {
  const parts = text.split(ROLE_PATTERN);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (/^@(Buyer|Supplier|DeMaxtore)$/i.test(part)) {
          return (
            <span
              key={i}
              className="font-medium text-violet-700 bg-violet-50 px-1 rounded"
              data-testid="hub-mention"
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function MentionChips({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5 mt-1">{children}</div>;
}

export function MentionChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="text-xs px-2 py-0.5 rounded-full border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
