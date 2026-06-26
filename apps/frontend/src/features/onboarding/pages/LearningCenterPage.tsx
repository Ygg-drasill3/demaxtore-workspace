import { BookOpen } from "lucide-react";
import { Card, CardBody, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/Card";
import { useLearningCenter } from "../hooks";
import { onboardingApi } from "../lib/onboarding.api";
import { COMMODITYBID_LEARNING } from "@dmx/contracts/commoditybid-learning";
import { MIXED_CONTAINER_LEARNING } from "@dmx/contracts/mixed-container-learning";
import { MIXED_CONTAINER_LIVE_PRICING_LEARNING } from "@dmx/contracts/mixed-container-live-pricing-learning";
import { MIXED_CONTAINER_PAYMENTS_LEARNING } from "@dmx/contracts/mixed-container-payments-learning";
import { MIXED_CONTAINER_EXECUTION_LEARNING } from "@dmx/contracts/mixed-container-execution-learning";
import { BULK_CONTAINER_LEARNING, BULK_CONTAINER_PROCUREMENT_LEARNING } from "@dmx/contracts/bulk-container-learning";
import {
  BULK_PRICING_LEARNING,
  BULK_OFFER_EXPIRY_LEARNING,
  BULK_SPEC_PRICING_LEARNING,
} from "@dmx/contracts/bulk-container-procurement-learning";
import {
  BULK_PAYMENTS_LEARNING,
  BULK_SUPPLIER_HIDDEN_LEARNING,
  BULK_PRE_EXECUTION_LEARNING,
} from "@dmx/contracts/bulk-container-coordination-learning";
import {
  BULK_POST_EXECUTION_READY_LEARNING,
  BULK_FREIGHTIQ_CONNECTION_LEARNING,
  BULK_EXECUTION_UNDERSTANDING_LEARNING,
} from "@dmx/contracts/bulk-container-execution-learning";
import { PACKING_TYPE_LEARNING } from "@dmx/contracts/packing-learning";
import { LearningGuidePanel } from "../components/LearningGuidePanel";
import { learningGuideSteps } from "../lib/learning-guides";

const LEARNING_CONTENT: Record<string, string> = {
  "mixed-container":
    MIXED_CONTAINER_LEARNING.summary + "\n\n" + MIXED_CONTAINER_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "mixed-container-live-pricing":
    MIXED_CONTAINER_LIVE_PRICING_LEARNING.summary + "\n\n" + MIXED_CONTAINER_LIVE_PRICING_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "mixed-container-payments":
    MIXED_CONTAINER_PAYMENTS_LEARNING.summary + "\n\n" + MIXED_CONTAINER_PAYMENTS_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "mixed-container-execution":
    MIXED_CONTAINER_EXECUTION_LEARNING.summary + "\n\n" + MIXED_CONTAINER_EXECUTION_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "bulk-container":
    BULK_CONTAINER_LEARNING.summary + "\n\n" + BULK_CONTAINER_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "bulk-container-procurement":
    BULK_CONTAINER_PROCUREMENT_LEARNING.summary + "\n\n" + BULK_CONTAINER_PROCUREMENT_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "bulk-pricing":
    BULK_PRICING_LEARNING.summary + "\n\n" + BULK_PRICING_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "bulk-offer-expiry":
    BULK_OFFER_EXPIRY_LEARNING.summary + "\n\n" + BULK_OFFER_EXPIRY_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "bulk-spec-pricing":
    BULK_SPEC_PRICING_LEARNING.summary + "\n\n" + BULK_SPEC_PRICING_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "bulk-payments":
    BULK_PAYMENTS_LEARNING.summary + "\n\n" + BULK_PAYMENTS_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "bulk-supplier-hidden":
    BULK_SUPPLIER_HIDDEN_LEARNING.summary + "\n\n" + BULK_SUPPLIER_HIDDEN_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "bulk-pre-execution":
    BULK_PRE_EXECUTION_LEARNING.summary + "\n\n" + BULK_PRE_EXECUTION_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "bulk-post-execution-ready":
    BULK_POST_EXECUTION_READY_LEARNING.summary + "\n\n" + BULK_POST_EXECUTION_READY_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "bulk-freightiq-connection":
    BULK_FREIGHTIQ_CONNECTION_LEARNING.summary + "\n\n" + BULK_FREIGHTIQ_CONNECTION_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "bulk-execution-understanding":
    BULK_EXECUTION_UNDERSTANDING_LEARNING.summary + "\n\n" + BULK_EXECUTION_UNDERSTANDING_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  "packing-type":
    PACKING_TYPE_LEARNING.summary + "\n\n" + PACKING_TYPE_LEARNING.topics.map((t) => `• ${t}`).join("\n"),
  rfq:
    "Create and submit an RFQ, then choose Direct RFQ or CommodityBid. DeMaxtore admin reviews, " +
    "assigns suppliers, and publishes the RFQ — suppliers cannot quote until publish.",
  "direct-rfq":
    "After admin publishes, suppliers submit quotations. You compare bids, select a winner, " +
    "request and approve the proforma, then issue the PO to spawn the order workspace.",
  freightiq:
    "On the order workspace, admin may open a freight request and enter forwarder offers. " +
    "You compare vessel sailings in the FreightIQ panel and select the best option.",
  tracking: "Monitor vessel position, ETA shifts, and delay exceptions from the shipment workspace and Control Tower.",
  "trade-documents": "Upload required documents (proforma, bill of lading, certificates). Operators review and approve for compliance.",
  "complete-trade-flow":
    "Universal entry: Create RFQ → Choose strategy.\n" +
    "Direct RFQ: Supplier responses → Buyer review → Issue PO → Order → FreightIQ → Shipment.\n" +
    "CommodityBid: Auction scheduling → Supplier invitations → Live auction → Lowest valid bid wins → Buyer approval → PO → Order → Shipment.",
};

function learningBody(slug: string, description: string): string {
  if (slug === "commoditybid") return COMMODITYBID_LEARNING.summary;
  return LEARNING_CONTENT[slug] ?? description;
}

export default function LearningCenterPage() {
  const { data, isLoading } = useLearningCenter();

  return (
    <div data-testid="learning-center-page" className="max-w-[1200px] mx-auto space-y-7 animate-fade-in">
      <header>
        <span className="dmx-eyebrow text-zinc-500">Help</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Learning Center</h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          Understand how DeMaxtore works — interactive step-by-step guides, no training required.
        </p>
      </header>

      {isLoading && <div className="dmx-card p-8 animate-pulse h-40" />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(data?.cards ?? []).map((card) => {
          const steps = learningGuideSteps(card.slug);
          return (
            <Card key={card.id} data-testid={`learning-card-${card.id}`}>
              <CardHeader>
                <BookOpen className="h-4 w-4 text-accent-900" />
                <div>
                  <CardEyebrow>Guide</CardEyebrow>
                  <CardTitle className="mt-1">{card.title}</CardTitle>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-sm text-zinc-600">{card.description}</p>
                <p className="text-sm text-ink-900 line-clamp-4">{learningBody(card.slug, card.description)}</p>
                <LearningGuidePanel steps={steps} testId={`learning-guide-${card.id}`} />
                {card.videoUrl ? (
                  <iframe
                    title={card.title}
                    src={card.videoUrl}
                    className="aspect-video w-full rounded-lg border border-zinc-200"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : null}
                <button
                  type="button"
                  className="text-sm font-medium text-accent-900 hover:underline"
                  data-testid={`learning-open-${card.id}`}
                  onClick={() => void onboardingApi.openLearning(card.id)}
                >
                  Mark as read →
                </button>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
