// apps/frontend/src/features/rfq/components/RfqClarificationPanel.tsx
//
// Sprint 2.5 — upgraded conversation panel. Adds:
//   • Read receipts under each message
//   • @mention chip above the input
//   • Inline attachment paperclip (creates a Document + chat reference)
//   • Visibility toggle (All participants ◯ Private to DeMaxtore admin)
//   • Avatar + organisation above every message
//
import { useMemo, useRef, useState } from "react";
import { MessageSquare, Send, Paperclip, X, AtSign, ShieldCheck } from "lucide-react";
import { useRfqClarifications, usePostClarification } from "../hooks";
import { rfqApi } from "../lib/rfq.api";
import { useAuth } from "@/store/auth.store";
import { useTelemetry } from "@/features/telemetry/useTelemetry";
import { initials, formatRelative, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { Button } from "@/components/ui/Button";

interface Attachment { id: string; fileName: string; url: string; sizeBytes: number; }
interface ReadReceipt { userId: string; userName: string; readAt: string; }
interface Msg {
  id:            string;
  authorUserId:  string;
  authorName?:   string;
  authorOrg?:    string;
  body:          string;
  createdAt:     string;
  visibility?:   "ALL" | "ADMIN_ONLY";
  mentions?:     Array<{ userId: string; userName: string }>;
  attachments?:  Attachment[];
  readReceipts?: ReadReceipt[];
}

interface Participant { userId: string; userName: string; organisation?: string; role: "BUYER" | "SUPPLIER" | "ADMIN"; }

interface Props {
  workspaceId:   string;
  participants?: Participant[];
}

export function RfqClarificationPanel({ workspaceId, participants = [] }: Props) {
  const { data, isLoading } = useRfqClarifications(workspaceId);
  const messages: Msg[] = (data as any)?.messages ?? (data as any) ?? [];
  const post = usePostClarification(workspaceId);
  const { track } = useTelemetry();
  const me = useAuth((s) => s.user);
  const [draft, setDraft] = useState("");
  const [visibility, setVisibility] = useState<"ALL" | "ADMIN_ONLY">("ALL");
  const [mention, setMention] = useState<Participant | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Array<{ id: string; fileName: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const unreadCount = useMemo(
    () => messages.filter((m) => m.authorUserId !== me?.id &&
                                 !(m.readReceipts ?? []).some((r) => r.userId === me?.id)).length,
    [messages, me?.id],
  );

  const send = async () => {
    const body = draft.trim();
    if (!body && pendingFiles.length === 0) return;
    track("clarification.opened", { workspaceId });
    await post.mutateAsync({
      message: body || "(attachment)",
      ...(mention ? { mentionedUserIds: [mention.userId] } : {}),
      ...(visibility !== "ALL" ? { visibility } : {}),
      ...(pendingFiles.length ? { attachmentIds: pendingFiles.map((f) => f.id) } : {}),
    });
    setDraft(""); setMention(null); setVisibility("ALL"); setPendingFiles([]);
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: Array<{ id: string; fileName: string }> = [];
      for (const file of Array.from(files).slice(0, 5)) {
        const row = await rfqApi.uploadAttachment(workspaceId, file);
        uploaded.push({ id: row.id, fileName: row.fileName });
      }
      setPendingFiles((prev) => [...prev, ...uploaded]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div data-testid="rfq-clarifications" className="dmx-card flex flex-col min-h-[420px]">
      <header className="px-5 py-3 border-b border-paper-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-zinc-500" />
          <h3 className="font-display text-base font-semibold tracking-tight">Clarifications</h3>
          <span className="text-xs text-zinc-400">{messages.length} messages</span>
          {unreadCount > 0 && (
            <span data-testid="clarif-unread"
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500 text-white tabular-nums">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          Visibility:
          <button data-testid="clarif-visibility-all"
                  onClick={() => setVisibility("ALL")}
                  className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border",
                    visibility === "ALL" ? "bg-ink-950 text-white border-ink-950" : "border-paper-200 text-zinc-600")}>
            ⦿ All participants
          </button>
          <button data-testid="clarif-visibility-admin"
                  onClick={() => setVisibility("ADMIN_ONLY")}
                  className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border",
                    visibility === "ADMIN_ONLY" ? "bg-amber-50 text-amber-800 border-amber-200" : "border-paper-200 text-zinc-600")}>
            <ShieldCheck className="h-3 w-3" /> Private to admin
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 dmx-thin-scroll">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-2/3" />)
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-zinc-700 font-medium">No clarifications yet.</p>
            <p className="text-xs text-zinc-500 mt-1">
              Ask suppliers about specs, lead times, certifications, or sample requests.
              All conversations stay inside this workspace.
            </p>
          </div>
        ) : messages.map((m) => {
          const mine = m.authorUserId === me?.id;
          const seenBy = (m.readReceipts ?? []).filter((r) => r.userId !== m.authorUserId);
          return (
            <div key={m.id} data-testid={`clarif-msg-${m.id}`}
                 className={cn("flex gap-2.5", mine ? "justify-end" : "")}>
              {!mine && <Avatar name={m.authorName ?? "?"} />}
              <div className={cn("max-w-[78%] space-y-1")}>
                <div className={cn("text-[11px] text-zinc-500", mine && "text-right")}>
                  <span className="font-medium text-ink-900">{mine ? "You" : m.authorName}</span>
                  {m.authorOrg && <span> · {m.authorOrg}</span>}
                  <span> · {formatRelative(m.createdAt)}</span>
                  {m.visibility === "ADMIN_ONLY" && (
                    <span className="ml-1.5 text-amber-700 inline-flex items-center gap-0.5">
                      <ShieldCheck className="h-3 w-3" /> private
                    </span>
                  )}
                </div>
                <div className={cn("rounded-lg px-3 py-2 text-sm leading-relaxed",
                  mine ? "bg-accent-900 text-white" : "bg-paper-100 text-ink-900",
                  m.visibility === "ADMIN_ONLY" && !mine && "bg-amber-50 border border-amber-200")}>
                  {m.mentions && m.mentions.map((mn) => (
                    <span key={mn.userId} className="font-medium underline mr-1">@{mn.userName}</span>
                  ))}
                  {m.body}
                </div>
                {m.attachments && m.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.attachments.map((a) => (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                         className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white border border-paper-200 text-zinc-700 hover:bg-paper-50">
                        <Paperclip className="h-3 w-3" /> {a.fileName}
                      </a>
                    ))}
                  </div>
                )}
                {seenBy.length > 0 && (
                  <div data-testid={`clarif-msg-receipts-${m.id}`}
                       className={cn("text-[10px] text-zinc-500", mine && "text-right")}>
                    ✓ Seen by {seenBy.map((r) => r.userName).join(", ")}
                  </div>
                )}
              </div>
              {mine && <Avatar name={me!.displayName} />}
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <footer className="border-t border-paper-200 px-5 py-3 space-y-2">
        {mention && (
          <div data-testid="clarif-mention-chip"
               className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-accent-50 text-accent-900 border border-accent-900/15">
            <AtSign className="h-3 w-3" /> {mention.userName}
            <button className="ml-1" onClick={() => setMention(null)} aria-label="Remove mention">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pendingFiles.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-paper-100 border border-paper-200">
                <Paperclip className="h-3 w-3" /> {f.fileName}
                <button type="button" aria-label="Remove" onClick={() => void rfqApi.deleteAttachment(workspaceId, f.id).then(() => setPendingFiles((p) => p.filter((x) => x.id !== f.id)))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" className="hidden" multiple onChange={(e) => void onPickFiles(e.target.files)} />
          <button type="button" data-testid="clarif-attach" className="dmx-btn-secondary h-11 px-3" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            data-testid="clarif-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send(); }}
            placeholder="Type a message… (Cmd+Enter to send)"
            rows={2}
            className="dmx-input flex-1 h-auto py-2 resize-y min-h-[44px]"
          />
          {participants.length > 0 && (
            <MentionPicker participants={participants} onPick={setMention} />
          )}
          <Button
            data-testid="clarif-send"
            onClick={send}
            disabled={!draft.trim() || post.isPending}
            loading={post.isPending}
          >
            <Send className="h-3.5 w-3.5" /> Send
          </Button>
        </div>
      </footer>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="h-8 w-8 rounded-full bg-ink-950 text-white grid place-items-center text-[11px] font-semibold shrink-0">
      {initials(name)}
    </div>
  );
}

function MentionPicker({ participants, onPick }: { participants: Participant[]; onPick: (p: Participant) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="ghost" size="md" data-testid="clarif-mention-button"
              onClick={() => setOpen((v) => !v)}><AtSign className="h-4 w-4" /></Button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 w-56 bg-white border border-paper-200 rounded-lg shadow-card py-1 z-10">
          {participants.map((p) => (
            <button key={p.userId}
                    onClick={() => { onPick(p); setOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-paper-50">
              <div className="font-medium text-ink-900">{p.userName}</div>
              {p.organisation && <div className="text-[10px] text-zinc-500">{p.organisation}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
