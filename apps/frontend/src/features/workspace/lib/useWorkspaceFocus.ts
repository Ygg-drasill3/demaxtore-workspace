import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { focusConversationHub } from "@/features/conversation-hub/lib/focus-conversation-hub";
import { focusTradeDocuments } from "@/features/workspace-communication/lib/focus-communication";

type Options = {
  communicationTestId?: string;
  documentsTestId?: string;
};

/** Scroll to Conversation Hub or documents panel when ?focus=messages|documents is present. */
export function useWorkspaceFocus({ communicationTestId, documentsTestId }: Options) {
  const [params, setSearchParams] = useSearchParams();

  useEffect(() => {
    const focus = params.get("focus");
    if (!focus) return;

    const timer = window.setTimeout(() => {
      if (focus === "messages" && communicationTestId) {
        focusConversationHub(communicationTestId);
      } else if (focus === "documents" && documentsTestId) {
        focusTradeDocuments(documentsTestId);
      }
      const next = new URLSearchParams(params);
      next.delete("focus");
      setSearchParams(next, { replace: true });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [params, setSearchParams, communicationTestId, documentsTestId]);
}
