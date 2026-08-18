import { focusConversationHub } from "@/features/conversation-hub/lib/focus-conversation-hub";

export const RFQ_SUPPLIER_MESSAGE_EVENT = "dmx:rfq-focus-supplier-message";

/** Scroll to RFQ Conversation Hub composer and focus the input. */
export function focusRfqCommunication() {
  focusConversationHub("rfq-communication");
}

/** Open the RFQ messages panel focused on a specific supplier thread. */
export function focusRfqSupplierCommunication(supplierUserId: string) {
  window.dispatchEvent(
    new CustomEvent(RFQ_SUPPLIER_MESSAGE_EVENT, { detail: { supplierUserId } }),
  );
  focusRfqCommunication();
}
