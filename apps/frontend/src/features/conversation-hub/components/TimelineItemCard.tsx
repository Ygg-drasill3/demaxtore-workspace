import {
  Activity,
  FileText,
  Gavel,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Pin,
  PinOff,
} from "lucide-react";
import type { TimelineItem, TimelineItemType } from "@dmx/contracts/conversation-hub";
import { MentionBody } from "./MentionBody";
import { TYPE_LABELS, deliveryLabel, formatWhen } from "../lib/conversation-hub.utils";

const TYPE_ICONS: Partial<Record<TimelineItemType, typeof FileText>> = {
  MESSAGE: MessageSquare,
  DOCUMENT: FileText,
  QUESTION: HelpCircle,
  ANSWER: HelpCircle,
  DECISION: Gavel,
  APPROVAL: CheckCircle2,
  ACTION_REQUIRED: AlertTriangle,
  SYSTEM_EVENT: Activity,
};

const TYPE_STYLES: Partial<Record<TimelineItemType, string>> = {
  MESSAGE: "border-zinc-200 bg-white",
  DOCUMENT: "border-blue-100 bg-blue-50/40",
  DECISION: "border-emerald-200 bg-emerald-50/50",
  APPROVAL: "border-teal-200 bg-teal-50/50",
  ACTION_REQUIRED: "border-rose-200 bg-rose-50/40",
  QUESTION: "border-amber-200 bg-amber-50/40",
  ANSWER: "border-amber-100 bg-amber-50/30",
};

interface Props {
  item: TimelineItem;
  myUserId?: string;
  highlighted?: boolean;
  onVisible?: () => void;
  onTogglePin?: () => void;
}

export default function TimelineItemCard({
  item,
  myUserId,
  highlighted,
  onVisible,
  onTogglePin,
}: Props) {
  const status = deliveryLabel(item, myUserId);
  const Icon = TYPE_ICONS[item.itemType] ?? MessageSquare;

  if (item.isSystemEvent) {
    return (
      <li
        data-testid={`hub-item-${item.id}`}
        className={`ml-4 scroll-mt-24 ${highlighted ? "ring-2 ring-blue-300 rounded-md" : ""}`}
        onMouseEnter={onVisible}
      >
        <span className="absolute -left-1.5 flex h-3 w-3 rounded-full bg-sky-500 ring-4 ring-white" />
        <div
          data-testid="hub-system-event"
          className="rounded-md border border-sky-200 bg-gradient-to-r from-sky-50 to-sky-50/30 px-3 py-2.5 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-sky-800">
            <Activity className="h-3.5 w-3.5" />
            <span className="font-semibold uppercase tracking-wide text-[10px]">System Event</span>
            <span className="text-sky-600">{formatWhen(item.createdAt)}</span>
            {onTogglePin && (
              <button type="button" className="ml-auto text-sky-600 hover:text-sky-800" onClick={onTogglePin}>
                {item.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
          <p className="mt-1 text-sky-950 font-medium" data-testid="hub-item-body">
            <MentionBody text={item.body} />
          </p>
        </div>
      </li>
    );
  }

  const style = TYPE_STYLES[item.itemType] ?? TYPE_STYLES.MESSAGE;

  return (
    <li
      data-testid={`hub-item-${item.id}`}
      className={`ml-4 scroll-mt-24 ${highlighted ? "ring-2 ring-blue-300 rounded-md" : ""}`}
      onMouseEnter={onVisible}
    >
      <span
        className={`absolute -left-1.5 flex h-3 w-3 rounded-full ring-4 ring-white ${
          item.itemType === "DECISION" || item.itemType === "APPROVAL"
            ? "bg-emerald-500"
            : item.itemType === "DOCUMENT"
              ? "bg-blue-400"
              : "bg-zinc-300"
        }`}
      />
      <article className={`rounded-md border px-3 py-2.5 text-sm shadow-sm ${style}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
          <Icon className="h-3.5 w-3.5" />
          <span data-testid={`hub-item-type-${item.itemType}`} className="font-semibold text-zinc-700">
            {TYPE_LABELS[item.itemType]}
          </span>
          <span>{item.authorName}</span>
          <span>{formatWhen(item.createdAt)}</span>
          {item.pinned && <Pin className="h-3 w-3 text-amber-600" />}
          {status && (
            <span data-testid="hub-delivery-state" className="ml-auto text-zinc-400">
              {status}
            </span>
          )}
          {onTogglePin && (
            <button type="button" className="text-zinc-400 hover:text-zinc-600" onClick={onTogglePin}>
              {item.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
        <p className="mt-1.5 text-zinc-900" data-testid="hub-item-body">
          <MentionBody text={item.body} />
        </p>
        {item.mentions.length > 0 && (
          <p className="text-xs text-violet-600 mt-1">
            Mentioned: {item.mentions.map((m) => m.displayName).join(", ")}
          </p>
        )}
        {item.attachments.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {item.attachments.map((a) => (
              <li
                key={a.id}
                data-testid={`hub-attachment-${a.id}`}
                className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded"
              >
                <FileText className="h-3 w-3" />
                {a.fileName}
              </li>
            ))}
          </ul>
        )}
      </article>
    </li>
  );
}
