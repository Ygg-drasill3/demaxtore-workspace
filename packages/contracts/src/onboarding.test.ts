import { describe, it, expect } from "vitest";
import {
  computeOnboardingJourney,
  computeCompletionPercent,
  computeTradeMilestones,
  nextActionForStep,
  buildChecklist,
} from "./onboarding";

describe("onboarding journey engine", () => {
  it("buyer with no RFQ starts at create_rfq", () => {
    const result = computeOnboardingJourney({
      role: "BUYER",
      hasRfq: false, hasQuotation: false, hasSupplierSelected: false,
      hasPoIssued: false, hasOrder: false, hasShipment: false, hasShipmentDelivered: false,
      hasInvitation: false, hasSubmittedOffer: false, hasAcceptedOrder: false,
      hasUploadedDocument: false, hasOpenWorkload: false, hasVerifiedDocument: false,
      hasReviewedShipment: false, hasClosedProcess: false,
    });
    expect(result.currentStep).toBe("create_rfq");
    expect(result.completedSteps).toEqual([]);
  });

  it("buyer with PO issued progresses to track_shipment", () => {
    const result = computeOnboardingJourney({
      role: "BUYER",
      hasRfq: true, hasQuotation: true, hasSupplierSelected: true,
      hasPoIssued: true, hasOrder: false, hasShipment: false, hasShipmentDelivered: false,
      hasInvitation: false, hasSubmittedOffer: false, hasAcceptedOrder: false,
      hasUploadedDocument: false, hasOpenWorkload: false, hasVerifiedDocument: false,
      hasReviewedShipment: false, hasClosedProcess: false,
    });
    expect(result.currentStep).toBe("track_shipment");
    expect(result.completedSteps).toContain("issue_po");
  });

  it("supplier first trade completes on shipment delivered", () => {
    const result = computeOnboardingJourney({
      role: "SUPPLIER",
      hasRfq: false, hasQuotation: false, hasSupplierSelected: false,
      hasPoIssued: false, hasOrder: true, hasShipment: false, hasShipmentDelivered: true,
      hasInvitation: true, hasSubmittedOffer: true, hasAcceptedOrder: true,
      hasUploadedDocument: true, hasOpenWorkload: false, hasVerifiedDocument: false,
      hasReviewedShipment: false, hasClosedProcess: false,
    });
    expect(result.firstTradeCompleted).toBe(true);
    expect(result.currentStep).toBeNull();
  });

  it("completion percent scales with steps", () => {
    expect(computeCompletionPercent("BUYER", ["create_rfq", "receive_quotation"])).toBe(33);
  });

  it("trade milestones mark current step", () => {
    const ms = computeTradeMilestones({
      hasRfq: true, hasPo: true, hasProduction: false,
      hasShipment: false, hasArrival: false, hasDocuments: false, isCompleted: false,
    });
    expect(ms.find((m) => m.key === "production")?.status).toBe("current");
    expect(ms.find((m) => m.key === "rfq")?.status).toBe("done");
  });

  it("next action returns href for buyer step", () => {
    const action = nextActionForStep("BUYER", "create_rfq");
    expect(action?.href).toBe("/buyer/rfq/new");
  });

  it("checklist marks current step", () => {
    const list = buildChecklist("BUYER", ["create_rfq"], "receive_quotation");
    expect(list.find((i) => i.step === "receive_quotation")?.current).toBe(true);
  });
});
