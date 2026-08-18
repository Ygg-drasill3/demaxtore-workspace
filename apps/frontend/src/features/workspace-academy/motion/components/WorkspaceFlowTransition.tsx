import { m } from "framer-motion";
import { WorkspaceConnector, type FlowNode } from "../svg/WorkspaceConnector";
import { guideDuration, guideEase } from "../motionTokens";

interface Props {
  variant: "rfq-po-order" | "order-shipment";
  reducedMotion: boolean;
  activeId?: string;
}

const RFQ_PO_ORDER: FlowNode[] = [
  { id: "rfq", label: "RFQ" },
  { id: "po", label: "PO" },
  { id: "order", label: "Order" },
];

const ORDER_SHIPMENT: FlowNode[] = [
  { id: "order", label: "Order" },
  { id: "freight", label: "Freight" },
  { id: "shipment", label: "Shipment" },
];

/** Educational diagram for workspace creation continuity (non-blocking). */
export function WorkspaceFlowTransition({ variant, reducedMotion, activeId }: Props) {
  const base = variant === "rfq-po-order" ? RFQ_PO_ORDER : ORDER_SHIPMENT;
  const nodes = base.map((n) => ({ ...n, active: n.id === activeId }));

  return (
    <m.div
      className="rounded-xl border border-[var(--dmx-guide-border)] bg-white/70 p-3"
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: guideDuration.normal, ease: guideEase.enter }}
      data-testid="academy-workspace-flow"
    >
      <WorkspaceConnector
        nodes={nodes}
        reducedMotion={reducedMotion}
        title={variant === "rfq-po-order" ? "RFQ → PO → Order" : "Order → Shipment"}
      />
    </m.div>
  );
}
