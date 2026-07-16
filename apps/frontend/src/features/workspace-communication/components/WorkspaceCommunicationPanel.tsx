import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Paperclip } from "lucide-react";
import type { CommWorkspaceType, MessageType, MessageVisibility } from "@dmx/contracts/workspace-communication";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { workspaceCommunicationApi } from "../lib/workspace-communication.api";
import AttachmentDownloadButton from "@/features/conversation-hub/components/AttachmentDownloadButton";
import { useAuth } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { useWorkspaceSocket } from "@/lib/socket";

const TYPE_LABELS: Record<MessageType, string> = {
  MESSAGE: "Message",
  QUESTION: "Question",
  ANSWER: "Answer",
  DECISION: "Decision",
  STATUS_UPDATE: "Status update",
  INTERNAL_NOTE: "Internal note",
  DOCUMENT: "Document",
  APPROVAL: "Approval",
  ACTION_REQUIRED: "Action required",
  SYSTEM_EVENT: "System event",
};

interface Props {
  workspaceType: CommWorkspaceType;
  workspaceId: string;
  /** Socket subscription workspace (audit id — order id for PO). */
  socketWorkspaceId?: string;
  testId?: string;
}

export default function WorkspaceCommunicationPanel({
  workspaceType,
  workspaceId,
  socketWorkspaceId,
  testId = "workspace-communication",
}: Props) {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("MESSAGE");
  const [visibility, setVisibility] = useState<MessageVisibility>("ALL_PARTICIPANTS");
  const [pendingAttachmentIds, setPendingAttachmentIds] = useState<string[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["workspace-communication", workspaceType, workspaceId],
    queryFn: () => workspaceCommunicationApi.get(workspaceType, workspaceId),
    enabled: !!workspaceId,
  });

  const { data: searchData } = useQuery({
    queryKey: ["workspace-communication", workspaceType, workspaceId, "search", searchQ],
    queryFn: () => workspaceCommunicationApi.search(workspaceType, workspaceId, {
      q: searchQ,
      mentionedMe: false,
    }),
    enabled: showSearch && searchQ.length >= 2,
  });

  const subscribeId = socketWorkspaceId ?? data?.auditWorkspaceId ?? workspaceId;

  const refreshCommunication = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["workspace-communication", workspaceType, workspaceId] });
  }, [qc, workspaceType, workspaceId]);

  useWorkspaceSocket(subscribeId, {
    [SocketEvents.COMMUNICATION_CREATED]: refreshCommunication,
    [SocketEvents.COMMUNICATION_UPDATED]: refreshCommunication,
    [SocketEvents.COMMUNICATION_DELETED]: refreshCommunication,
    [SocketEvents.COMMUNICATION_READ]: refreshCommunication,
    [SocketEvents.COMMUNICATION_MENTIONED]: refreshCommunication,
  });

  const messages = useMemo(() => {
    const raw = showSearch && searchQ.length >= 2 ? searchData?.items : data?.messages;
    return Array.isArray(raw) ? raw : [];
  }, [showSearch, searchQ, searchData, data]);

  const visibilityOptions: MessageVisibility[] = user?.role === "ADMIN"
    ? ["ALL_PARTICIPANTS", "BUYER_ONLY", "SUPPLIER_ONLY", "ADMIN_ONLY", "BUYER_ADMIN", "SUPPLIER_ADMIN"]
    : user?.role === "BUYER"
      ? ["ALL_PARTICIPANTS", "BUYER_ONLY", "BUYER_ADMIN"]
      : ["ALL_PARTICIPANTS", "SUPPLIER_ONLY", "SUPPLIER_ADMIN"];

  const typeOptions: MessageType[] = user?.role === "ADMIN"
    ? ["MESSAGE", "QUESTION", "ANSWER", "DECISION", "STATUS_UPDATE", "INTERNAL_NOTE"]
    : ["MESSAGE", "QUESTION", "ANSWER", "DECISION", "STATUS_UPDATE"];

  const send = async () => {
    const body = draft.trim();
    if (!body && pendingAttachmentIds.length === 0) return;
    try {
      await workspaceCommunicationApi.action(workspaceType, workspaceId, "create-message", {
        payload: {
          body: body || "(attachment)",
          messageType,
          visibility,
          attachmentIds: pendingAttachmentIds.length ? pendingAttachmentIds : undefined,
        },
      });
      setDraft("");
      setPendingAttachmentIds([]);
      setMessageType("MESSAGE");
      setVisibility("ALL_PARTICIPANTS");
      qc.invalidateQueries({ queryKey: ["workspace-communication", workspaceType, workspaceId] });
      toast.success("Message sent");
    } catch {
      toast.error("Failed to send message");
    }
  };

  const onFile = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const up = await workspaceCommunicationApi.uploadAttachment(workspaceType, workspaceId, files[0]);
      setPendingAttachmentIds((ids) => [...ids, up.id]);
      toast.success("Attachment ready");
    } catch {
      toast.error("Upload failed");
    }
  };

  const markRead = async (messageId: string) => {
    await workspaceCommunicationApi.action(workspaceType, workspaceId, "mark-read", {
      payload: { messageId },
    });
    qc.invalidateQueries({ queryKey: ["workspace-communication", workspaceType, workspaceId] });
  };

  const readState = (m: {
    authorUserId: string | null;
    readReceipts?: Array<{ userId: string }>;
    readByMe: boolean;
  }) => {
    if (!m.authorUserId || m.authorUserId !== user?.id) return null;
    const receipts = m.readReceipts ?? [];
    const others = receipts.filter((r) => r.userId !== m.authorUserId);
    return others.length > 0 ? "✓✓ Read" : "✓ Sent";
  };

  return (
    <div data-testid={testId} className="dmx-card flex flex-col min-h-[360px]">
      <header className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-zinc-500" />
          <h3 className="font-medium">Communication</h3>
          {(data?.unreadCount ?? 0) > 0 && (
            <span data-testid="comm-unread-badge" className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {data!.unreadCount} unread
            </span>
          )}
        </div>
        <button
          type="button"
          className="text-xs text-blue-600"
          data-testid="comm-search-toggle"
          onClick={() => setShowSearch((v) => !v)}
        >
          Search
        </button>
      </header>

      {showSearch && (
        <div className="px-4 py-2 border-b" data-testid="comm-search">
          <input
            className="w-full text-sm border rounded px-2 py-1"
            placeholder="Search messages…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            data-testid="comm-search-input"
          />
        </div>
      )}

      <div data-testid="comm-messages" className="flex-1 overflow-auto px-4 py-3 space-y-3 max-h-80">
        {isLoading && <p className="text-sm text-zinc-500">Loading…</p>}
        {!isLoading && messages.length === 0 && (
          <p className="text-sm text-zinc-500">No messages yet.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            data-testid={`comm-message-${m.id}`}
            className="text-sm border-b border-zinc-50 pb-2"
            onClick={() => !m.readByMe && m.authorUserId !== user?.id && void markRead(m.id)}
          >
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span data-testid={`comm-msg-type-${m.messageType}`}>{TYPE_LABELS[m.messageType]}</span>
              <span>{m.authorName}</span>
              <span>{new Date(m.createdAt).toLocaleString()}</span>
              {readState(m) && (
                <span data-testid="comm-read-state" className="ml-auto text-zinc-400">{readState(m)}</span>
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap" data-testid="comm-message-body">{m.body}</p>
            {(m.attachments ?? []).length > 0 && (
              <ul className="flex flex-wrap gap-2 mt-1">
                {(m.attachments ?? []).map((a) => (
                  <li key={a.id} data-testid={`comm-attachment-${a.id}`}>
                    <AttachmentDownloadButton
                      workspaceType={workspaceType}
                      workspaceId={workspaceId}
                      attachmentId={a.id}
                      fileName={a.fileName}
                      mimeType={a.mimeType}
                      fileSizeBytes={a.fileSizeBytes}
                      downloadUrl={workspaceCommunicationApi.downloadUrl(workspaceType, workspaceId, a.id)}
                      testId={`comm-attachment-download-${a.id}`}
                    />
                  </li>
                ))}
              </ul>
            )}
            {(m.mentions ?? []).length > 0 && (
              <p className="text-xs text-violet-600 mt-1" data-testid="comm-mentions">
                @{(m.mentions ?? []).map((x) => x.displayName).join(", @")}
              </p>
            )}
          </div>
        ))}
      </div>

      <footer className="px-4 py-3 border-t space-y-2" data-testid="comm-composer">
        <div className="flex flex-wrap gap-2 text-xs">
          <select
            data-testid="comm-message-type"
            className="border rounded px-2 py-1"
            value={messageType}
            onChange={(e) => setMessageType(e.target.value as MessageType)}
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
          <select
            data-testid="comm-visibility"
            className="border rounded px-2 py-1"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as MessageVisibility)}
          >
            {visibilityOptions.map((v) => (
              <option key={v} value={v}>{v.replace(/_/g, " ")}</option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-zinc-600"
            data-testid="comm-attach-btn"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="h-3 w-3" />
            Attach
          </button>
          {pendingAttachmentIds.length > 0 && (
            <span data-testid="comm-pending-attachments" className="text-zinc-500">
              {pendingAttachmentIds.length} file(s)
            </span>
          )}
        </div>
        <textarea
          data-testid="comm-input"
          className="w-full text-sm border rounded px-2 py-2 min-h-[72px]"
          placeholder="Write a message… Use @name to mention"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          data-testid="comm-send"
          className="dmx-btn-primary text-sm inline-flex items-center gap-2"
          onClick={() => void send()}
        >
          <Send className="h-3 w-3" /> Send
        </button>
      </footer>
      <input ref={fileRef} type="file" className="hidden" onChange={(e) => void onFile(e.target.files)} />
    </div>
  );
}
