import { Navigate } from "react-router-dom";

/** Admin conversations — redirects to canonical /messages hub. */
export default function AdminConversationsPage() {
  return <Navigate to="/messages" replace />;
}
