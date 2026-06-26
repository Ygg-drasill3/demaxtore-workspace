import { useLocation } from "react-router-dom";
import { FreightIqEmbedFrame } from "../components/FreightIqEmbedFrame";

const DEFAULT_NEXT: Record<string, string> = {
  BUYER: "/dashboard",
  SUPPLIER: "/dashboard",
  ADMIN: "/admin",
};

/** FreightIQ dashboard — workspace içinde tam ekran iframe */
export default function FreightIqEmbedPage() {
  const location = useLocation();
  const roleSegment = location.pathname.split("/")[1]?.toUpperCase() ?? "BUYER";
  const params = new URLSearchParams(location.search);
  const createMode = params.get("create") === "1";
  const orderId = params.get("orderId") ?? undefined;
  const workspaceRfqId = params.get("workspaceRfqId") ?? params.get("rfqId") ?? undefined;
  const nextPath = createMode ? "/rfqs?new=1" : (DEFAULT_NEXT[roleSegment] ?? "/dashboard");

  return (
    <div className="h-full w-full" data-testid="freightiq-embed-page">
      <FreightIqEmbedFrame
        nextPath={nextPath}
        orderId={orderId}
        workspaceRfqId={workspaceRfqId}
        fullscreen
      />
    </div>
  );
}
