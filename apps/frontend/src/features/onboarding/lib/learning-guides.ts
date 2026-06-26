import { COMMODITYBID_LEARNING } from "@dmx/contracts/commoditybid-learning";
import { MIXED_CONTAINER_LEARNING } from "@dmx/contracts/mixed-container-learning";
import { BULK_CONTAINER_LEARNING } from "@dmx/contracts/bulk-container-learning";

const GENERIC_STEPS: Record<string, Array<{ step: string; detail: string }>> = {
  rfq: [
    { step: "Create & submit", detail: "Add line items and submit for DeMaxtore review." },
    { step: "Choose strategy", detail: "Direct RFQ or CommodityBid auction after creation." },
    { step: "Admin publish", detail: "Operations assigns suppliers and publishes the RFQ." },
    { step: "Award & PO", detail: "Compare bids, proforma, then issue PO." },
  ],
  "direct-rfq": [
    { step: "Admin assigns", detail: "DeMaxtore assigns verified suppliers to your RFQ." },
    { step: "Collect quotes", detail: "After publish, suppliers submit quotations." },
    { step: "Select supplier", detail: "Evaluate bids and award the winner." },
    { step: "Proforma & PO", detail: "Request proforma, approve, then issue PO." },
  ],
  freightiq: [
    { step: "Order workspace", detail: "FreightIQ lives inside the order execution panel." },
    { step: "Admin offers", detail: "Operations enters forwarder sailings for your route." },
    { step: "Compare & select", detail: "Pick price, transit, and ETD that fit your cargo." },
    { step: "Shipment", detail: "Selected sailing links to shipment tracking." },
  ],
  tracking: [
    { step: "Link container", detail: "Enter container or booking reference on the shipment." },
    { step: "Sync position", detail: "Provider updates vessel, ETA, and delay flags." },
    { step: "Monitor exceptions", detail: "Delays surface in workspace and Control Tower." },
    { step: "Complete delivery", detail: "Confirm delivery after customs and last-mile." },
  ],
  "trade-documents": [
    { step: "See requirements", detail: "Compliance checklist shows mandatory document types." },
    { step: "Upload files", detail: "Suppliers upload PDFs per document type." },
    { step: "Review & approve", detail: "Buyer or operator approves each document." },
    { step: "Ready for shipment", detail: "All required docs approved before departure." },
  ],
  "complete-trade-flow": [
    { step: "RFQ entry", detail: "Every trade starts with an RFQ workspace." },
    { step: "Procurement", detail: "Direct RFQ negotiation or CommodityBid auction." },
    { step: "Execution", detail: "PO → order → FreightIQ → shipment." },
    { step: "Close loop", detail: "Documents, tracking, and delivery confirmation." },
  ],
};

export function learningGuideSteps(slug: string): Array<{ step: string; detail: string }> {
  if (slug === "commoditybid") return [...COMMODITYBID_LEARNING.howItWorks];
  if (slug === "mixed-container") {
    return MIXED_CONTAINER_LEARNING.topics.map((t, i) => ({
      step: `Step ${i + 1}`,
      detail: t,
    }));
  }
  if (slug === "bulk-container" || slug === "bulk-container-procurement") {
    return BULK_CONTAINER_LEARNING.topics.map((t, i) => ({
      step: `Step ${i + 1}`,
      detail: t,
    }));
  }
  return GENERIC_STEPS[slug] ?? [];
}
