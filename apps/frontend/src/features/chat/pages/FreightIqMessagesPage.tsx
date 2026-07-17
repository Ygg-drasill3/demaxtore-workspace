import { Navigate, useSearchParams } from "react-router-dom";

/** Legacy FreightIQ Messages — redirects to unified /messages with FREIGHT context. */
export default function FreightIqMessagesPage() {
  const [params] = useSearchParams();
  const orderId = params.get("orderId");
  const workspaceRfqId = params.get("workspaceRfqId");
  const query = new URLSearchParams({ contextType: "FREIGHT" });
  if (orderId) query.set("contextId", orderId);
  if (workspaceRfqId) query.set("contextId", workspaceRfqId);
  return <Navigate to={`/messages?${query.toString()}`} replace />;
}
