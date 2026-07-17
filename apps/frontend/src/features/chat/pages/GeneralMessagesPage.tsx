import { Navigate, useParams } from "react-router-dom";

/** Legacy General Messages — redirects to canonical /messages. */
export default function GeneralMessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  if (conversationId) return <Navigate to={`/messages/${conversationId}`} replace />;
  return <Navigate to="/messages" replace />;
}
