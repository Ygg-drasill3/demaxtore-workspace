export type TimelineFilter =
  | "all"
  | "messages"
  | "documents"
  | "system"
  | "decisions"
  | "approvals"
  | "questions"
  | "unread"
  | "attachments";

export type HubSection = "timeline" | "decisions" | "library" | "actions";
