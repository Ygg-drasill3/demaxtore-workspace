import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, Search, LayoutList, Gavel, FolderOpen, ListTree } from "lucide-react";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import type { TimelineItem, TimelineItemType } from "@dmx/contracts/conversation-hub";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { conversationHubApi } from "../lib/conversation-hub.api";
import type { HubSection, TimelineFilter } from "../lib/conversation-hub.types";
import { ROLE_MENTION_TOKENS, TYPE_LABELS, filterTimeline } from "../lib/conversation-hub.utils";
import { useAuth } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { useWorkspaceSocket, getSocket } from "@/lib/socket";
import ConversationHubHeader from "./ConversationHubHeader";
import ConversationSummaryCard from "./ConversationSummaryCard";
import ActionCenter from "./ActionCenter";
import DecisionLog from "./DecisionLog";
import AttachmentLibraryPanel from "./AttachmentLibraryPanel";
import PinnedTimeline from "./PinnedTimeline";
import TimelineFilterBar from "./TimelineFilterBar";
import TimelineItemCard from "./TimelineItemCard";
import { MentionChip, MentionChips } from "./MentionBody";

const COMPOSER_TYPES: TimelineItemType[] = [
  "MESSAGE",
  "DOCUMENT",
  "QUESTION",
  "ANSWER",
  "DECISION",
  "APPROVAL",
  "ACTION_REQUIRED",
  "STATUS_UPDATE",
];

interface Props {
  workspaceType: CommWorkspaceType;
  workspaceId: string;
  socketWorkspaceId?: string;
  testId?: string;
  /** Restrict UI to communication actions (passwordless access). */
  communicationOnly?: boolean;
}

export default function ConversationHubPanel({
  workspaceType,
  workspaceId,
  socketWorkspaceId,
  testId = "conversation-hub",
  communicationOnly = false,
}: Props) {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [itemType, setItemType] = useState<TimelineItemType>("MESSAGE");
  const [visibility, setVisibility] = useState("ALL_PARTICIPANTS");
  const [pendingAttachmentIds, setPendingAttachmentIds] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchParticipant, setSearchParticipant] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchFileName, setSearchFileName] = useState("");
  const [activeFilter, setActiveFilter] = useState<TimelineFilter>("all");
  const [activeSection, setActiveSection] = useState<HubSection>("timeline");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const sendInFlight = useRef(false);
  const pendingClientMessageId = useRef<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["conversation-hub", workspaceType, workspaceId],
    queryFn: () => conversationHubApi.get(workspaceType, workspaceId),
    enabled: !!workspaceId,
  });

  const searchActive =
    showSearch && (searchQ.length >= 2 || searchParticipant || searchDateFrom || searchDateTo || searchFileName);

  const { data: searchData } = useQuery({
    queryKey: [
      "conversation-hub",
      workspaceType,
      workspaceId,
      "search",
      searchQ,
      searchParticipant,
      searchDateFrom,
      searchDateTo,
      searchFileName,
    ],
    queryFn: () =>
      conversationHubApi.search(workspaceType, workspaceId, {
        q: searchQ || undefined,
        participantUserId: searchParticipant || undefined,
        dateFrom: searchDateFrom ? new Date(searchDateFrom).toISOString() : undefined,
        dateTo: searchDateTo ? new Date(searchDateTo).toISOString() : undefined,
        fileName: searchFileName || undefined,
      }),
    enabled: !!searchActive,
  });

  const subscribeId = socketWorkspaceId ?? data?.auditWorkspaceId ?? workspaceId;

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["conversation-hub", workspaceType, workspaceId] });
  }, [qc, workspaceType, workspaceId]);

  useWorkspaceSocket(subscribeId, {
    [SocketEvents.COMMUNICATION_CREATED]: refresh,
    [SocketEvents.COMMUNICATION_UPDATED]: refresh,
    [SocketEvents.COMMUNICATION_DELETED]: refresh,
    [SocketEvents.COMMUNICATION_READ]: refresh,
    [SocketEvents.COMMUNICATION_MENTIONED]: refresh,
  });

  // Refetch timeline after Socket.io reconnect so messages sent while offline appear once.
  useEffect(() => {
    const sock = getSocket();
    const onReconnect = () => {
      refresh();
    };
    sock.io.on("reconnect", onReconnect);
    return () => {
      sock.io.off("reconnect", onReconnect);
    };
  }, [refresh]);

  const pinnedIds = useMemo(() => new Set((data?.pinnedItems ?? []).map((p) => p.id)), [data?.pinnedItems]);

  const timeline = useMemo(() => {
    const raw = searchActive ? searchData?.items : data?.timeline;
    const items = Array.isArray(raw) ? raw : [];
    const unpinned = items.filter((t) => !pinnedIds.has(t.id));
    return filterTimeline(unpinned, activeFilter);
  }, [searchActive, searchData, data, activeFilter, pinnedIds]);

  const scrollToItem = (id: string | null) => {
    if (!id) return;
    setActiveSection("timeline");
    setHighlightId(id);
    setTimeout(() => {
      const el = document.querySelector(`[data-testid="hub-item-${id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    setTimeout(() => setHighlightId(null), 2500);
  };

  const visibilityOptions = communicationOnly
    ? ["ALL_PARTICIPANTS"]
    : user?.role === "ADMIN"
      ? ["ALL_PARTICIPANTS", "BUYER_ONLY", "SUPPLIER_ONLY", "ADMIN_ONLY", "BUYER_ADMIN", "SUPPLIER_ADMIN"]
      : user?.role === "BUYER"
        ? ["ALL_PARTICIPANTS", "BUYER_ONLY", "BUYER_ADMIN"]
        : ["ALL_PARTICIPANTS", "SUPPLIER_ONLY", "SUPPLIER_ADMIN"];

  const communicationComposerTypes: TimelineItemType[] = ["MESSAGE", "DOCUMENT", "QUESTION", "ANSWER"];

  const composerTypes = communicationOnly
    ? communicationComposerTypes
    : user?.role === "ADMIN"
      ? [...COMPOSER_TYPES, "INTERNAL_NOTE" as TimelineItemType]
      : COMPOSER_TYPES;

  const visibleSections: Array<{ id: HubSection; label: string; icon: typeof ListTree }> = communicationOnly
    ? [
        { id: "timeline", label: "Timeline", icon: ListTree },
        { id: "library", label: "Library", icon: FolderOpen },
      ]
    : [
        { id: "timeline", label: "Timeline", icon: ListTree },
        { id: "actions", label: "Actions", icon: LayoutList },
        { id: "decisions", label: "Decisions", icon: Gavel },
        { id: "library", label: "Library", icon: FolderOpen },
      ];

  const insertMention = (token: string) => {
    setDraft((d) => (d.endsWith(" ") || !d ? `${d}${token} ` : `${d} ${token} `));
  };

  const send = async () => {
    const body = draft.trim();
    if (!body && pendingAttachmentIds.length === 0) return;
    if (sendInFlight.current) return;

    sendInFlight.current = true;
    setIsSending(true);
    setSendError(null);

    const clientMessageId = pendingClientMessageId.current ?? crypto.randomUUID();
    pendingClientMessageId.current = clientMessageId;

    const savedDraft = draft;
    const savedAttachments = [...pendingAttachmentIds];
    const savedItemType = itemType;
    const savedVisibility = visibility;

    try {
      await conversationHubApi.createItem(
        workspaceType,
        workspaceId,
        {
          body: body || "(attachment)",
          itemType: pendingAttachmentIds.length && itemType === "MESSAGE" ? "DOCUMENT" : itemType,
          visibility,
          attachmentIds: pendingAttachmentIds.length ? pendingAttachmentIds : undefined,
          clientMessageId,
        },
        { idempotencyKey: clientMessageId },
      );
      pendingClientMessageId.current = null;
      setDraft("");
      setPendingAttachmentIds([]);
      setItemType("MESSAGE");
      setVisibility("ALL_PARTICIPANTS");
      refresh();
      toast.success("Timeline entry added");
    } catch {
      setDraft(savedDraft);
      setPendingAttachmentIds(savedAttachments);
      setItemType(savedItemType);
      setVisibility(savedVisibility);
      setSendError("Failed to send message. Your text was preserved — try again.");
      toast.error("Failed to add timeline entry");
    } finally {
      sendInFlight.current = false;
      setIsSending(false);
    }
  };

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const onFile = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const up = await conversationHubApi.uploadAttachment(workspaceType, workspaceId, files[0]);
      setPendingAttachmentIds((ids) => [...ids, up.id]);
      toast.success("Attachment ready");
    } catch {
      toast.error("Upload failed");
    }
  };

  const onItemVisible = async (item: TimelineItem) => {
    if (item.readByMe || item.authorUserId === user?.id || item.isSystemEvent) return;
    try {
      await conversationHubApi.markDelivered(workspaceType, workspaceId, item.id);
      await conversationHubApi.markRead(workspaceType, workspaceId, item.id);
      refresh();
    } catch {
      /* non-blocking */
    }
  };

  const togglePin = async (item: TimelineItem) => {
    try {
      await conversationHubApi.setPinned(workspaceType, workspaceId, item.id, !item.pinned);
      refresh();
      toast.success(item.pinned ? "Unpinned" : "Pinned to top");
    } catch {
      toast.error("Could not update pin");
    }
  };

  const sections = visibleSections;

  return (
    <div data-testid={testId} className="dmx-card flex flex-col min-h-[520px] overflow-hidden">
      {data?.header && <ConversationHubHeader header={data.header} />}

      {data?.summary && <ConversationSummaryCard summary={data.summary} />}

      <div className="flex flex-wrap gap-1 px-4 mt-4 border-b border-zinc-100">
        {sections.map((s) => {
          const Icon = s.icon;
          const count =
            s.id === "actions"
              ? data?.pendingActions.length
              : s.id === "decisions"
                ? data?.decisions.length
                : s.id === "library"
                  ? data?.attachmentLibrary.totalCount
                  : undefined;
          return (
            <button
              key={s.id}
              type="button"
              data-testid={`hub-tab-${s.id}`}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition ${
                activeSection === s.id
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
              onClick={() => setActiveSection(s.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
              {count != null && count > 0 && (
                <span className="rounded-full bg-zinc-100 px-1.5 text-[10px]">{count}</span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-1 px-2 py-2 text-xs text-blue-600"
          data-testid="hub-search-toggle"
          onClick={() => setShowSearch((v) => !v)}
        >
          <Search className="h-3 w-3" /> Search
        </button>
      </div>

      {showSearch && (
        <div className="px-4 py-3 border-b bg-zinc-50 space-y-2" data-testid="hub-search">
          <input
            className="w-full text-sm border rounded px-2 py-1"
            placeholder="Keyword…"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            data-testid="hub-search-input"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              className="text-sm border rounded px-2 py-1"
              value={searchParticipant}
              onChange={(e) => setSearchParticipant(e.target.value)}
            >
              <option value="">All participants</option>
              {(data?.participants ?? []).map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.fullName}
                </option>
              ))}
            </select>
            <input
              className="text-sm border rounded px-2 py-1"
              placeholder="Document name…"
              value={searchFileName}
              onChange={(e) => setSearchFileName(e.target.value)}
            />
            <input type="date" className="text-sm border rounded px-2 py-1" value={searchDateFrom} onChange={(e) => setSearchDateFrom(e.target.value)} />
            <input type="date" className="text-sm border rounded px-2 py-1" value={searchDateTo} onChange={(e) => setSearchDateTo(e.target.value)} />
          </div>
        </div>
      )}

      {activeSection === "timeline" && <TimelineFilterBar active={activeFilter} onChange={setActiveFilter} />}

      <div ref={timelineRef} className="flex-1 overflow-auto py-4 max-h-[32rem]">
        {isLoading && <p className="text-sm text-zinc-500 px-4">Loading operational history…</p>}

        {!isLoading && activeSection === "actions" && (
          <ActionCenter actions={data?.pendingActions ?? []} onSelect={scrollToItem} />
        )}

        {!isLoading && activeSection === "decisions" && (
          <div className="px-4">
            <DecisionLog decisions={data?.decisions ?? []} onSelect={scrollToItem} />
          </div>
        )}

        {!isLoading && activeSection === "library" && (
          <div className="px-4">
            <AttachmentLibraryPanel
              library={data?.attachmentLibrary ?? { categories: [], totalCount: 0 }}
              workspaceType={workspaceType}
              workspaceId={workspaceId}
            />
          </div>
        )}

        {!isLoading && activeSection === "timeline" && (
          <>
            <PinnedTimeline
              items={data?.pinnedItems ?? []}
              myUserId={user?.id}
              workspaceType={workspaceType}
              workspaceId={workspaceId}
              onTogglePin={togglePin}
              onVisible={onItemVisible}
            />
            <div data-testid="hub-timeline" className="px-4">
              {timeline.length === 0 && (
                <p className="text-sm text-zinc-500 py-4">No entries match this filter.</p>
              )}
              <ol className="relative border-l border-zinc-200 ml-2 space-y-4">
                {timeline.map((item) => (
                  <TimelineItemCard
                    key={item.id}
                    item={item}
                    myUserId={user?.id}
                    workspaceType={workspaceType}
                    workspaceId={workspaceId}
                    highlighted={highlightId === item.id}
                    onVisible={() => void onItemVisible(item)}
                    onTogglePin={() => void togglePin(item)}
                  />
                ))}
              </ol>
            </div>
          </>
        )}
      </div>

      <footer className="px-4 py-3 border-t space-y-2 bg-zinc-50/80" data-testid="hub-composer">
        <p className="text-xs text-zinc-500">Record a decision, question, or operational update.</p>
        <MentionChips>
          {ROLE_MENTION_TOKENS.map((t) => (
            <MentionChip key={t} label={t} onClick={() => insertMention(t)} />
          ))}
        </MentionChips>
        <div className="flex flex-wrap gap-2 text-xs">
          <select
            data-testid="hub-item-type"
            className="border rounded px-2 py-1 bg-white"
            value={itemType}
            onChange={(e) => setItemType(e.target.value as TimelineItemType)}
          >
            {composerTypes.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
          <select
            data-testid="hub-visibility"
            className="border rounded px-2 py-1 bg-white"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            {visibilityOptions.map((v) => (
              <option key={v} value={v}>{v.replace(/_/g, " ")}</option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-zinc-600"
            data-testid="hub-attach-btn"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="h-3 w-3" />
            Attach
          </button>
          {pendingAttachmentIds.length > 0 && (
            <span data-testid="hub-pending-attachments" className="text-zinc-500">
              {pendingAttachmentIds.length} file(s)
            </span>
          )}
        </div>
        <textarea
          data-testid="hub-input"
          className="w-full text-sm border rounded px-2 py-2 min-h-[72px] bg-white"
          placeholder="Describe the decision, question, or update… Use @Buyer @Supplier @DeMaxtore"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (sendError) setSendError(null);
          }}
          onKeyDown={onComposerKeyDown}
          disabled={isSending}
        />
        {sendError && (
          <p className="text-sm text-red-600" data-testid="hub-send-error" role="alert">
            {sendError}
          </p>
        )}
        <button
          type="button"
          data-testid="hub-send"
          className="dmx-btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isSending || (!draft.trim() && pendingAttachmentIds.length === 0)}
          onClick={() => void send()}
        >
          <Send className="h-3 w-3" /> {isSending ? "Sending…" : "Add to timeline"}
        </button>
      </footer>
      <input ref={fileRef} type="file" className="hidden" onChange={(e) => void onFile(e.target.files)} />
    </div>
  );
}
