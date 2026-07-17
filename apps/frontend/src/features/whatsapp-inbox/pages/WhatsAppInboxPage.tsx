import { Navigate } from "react-router-dom";

/** Legacy WhatsApp Inbox — redirects to canonical /messages with WhatsApp filter. */
export default function WhatsAppInboxPage() {
  return <Navigate to="/messages?channel=WHATSAPP" replace />;
}
