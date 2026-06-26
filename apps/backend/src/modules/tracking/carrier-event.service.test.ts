import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CarrierEventService,
  normalizeCarrierEvent,
  isCarrierAutoTransitionEnabled,
} from "./carrier-event.service.js";
import { CARRIER_EVENT_TO_SHIPMENT_ACTION } from "@dmx/contracts/logistics-events";

vi.mock("../../config/env.js", () => ({
  env: { CARRIER_AUTO_TRANSITION_ENABLED: false, LOG_LEVEL: "silent" },
  isProd: false,
}));

vi.mock("../orchestration/order-shipment-orchestrator.service.js", () => ({
  OrderShipmentOrchestrator: vi.fn().mockImplementation(() => ({
    onCarrierEvent: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("carrier events", () => {
  it("returns null when eventId is missing", () => {
    expect(
      normalizeCarrierEvent("maersk", { eventType: "LOADED_ON_VESSEL", shipmentId: "ship-1" }),
    ).toBeNull();
  });

  it("normalizes webhook body", () => {
    const event = normalizeCarrierEvent("maersk", {
      eventType: "LOADED_ON_VESSEL",
      eventId: "evt-1",
      shipmentId: "00000000-0000-0000-0000-000000000099",
      confidence: "high",
    });
    expect(event?.eventType).toBe("LOADED_ON_VESSEL");
    expect(event?.confidence).toBe("high");
  });

  it("maps loaded on vessel to load_vessel action", () => {
    expect(CARRIER_EVENT_TO_SHIPMENT_ACTION.LOADED_ON_VESSEL).toBe("load_vessel");
  });

  it("isCarrierAutoTransitionEnabled returns false by default", () => {
    expect(isCarrierAutoTransitionEnabled()).toBe(false);
  });
});

describe("CarrierEventService.ingest", () => {
  const carrierEventRecord = {
    upsert: vi.fn(),
    update: vi.fn(),
  };
  const timelineEvent = { create: vi.fn() };
  const db = { carrierEventRecord, timelineEvent } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    carrierEventRecord.upsert.mockResolvedValue({ id: "rec-1" });
    carrierEventRecord.update.mockResolvedValue({});
    timelineEvent.create.mockResolvedValue({});
  });

  const baseEvent = {
    provider: "maersk",
    externalEventId: "evt-1",
    eventType: "LOADED_ON_VESSEL" as const,
    shipmentId: "ship-1",
    occurredAt: new Date().toISOString(),
    confidence: "high" as const,
    rawPayload: {},
  };

  it("low confidence → timeline_only, no FSM", async () => {
    const svc = new CarrierEventService(db);
    const result = await svc.ingest({ ...baseEvent, confidence: "low" });
    expect(result.status).toBe("timeline_only");
    expect(timelineEvent.create).toHaveBeenCalled();
    expect(carrierEventRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "timeline_only" } }),
    );
  });

  it("medium confidence → review queue", async () => {
    const svc = new CarrierEventService(db);
    const result = await svc.ingest({ ...baseEvent, confidence: "medium" });
    expect(result.status).toBe("review");
    expect(timelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: "carrier.event.review_required" }),
      }),
    );
  });

  it("high confidence with auto off → logged only", async () => {
    const svc = new CarrierEventService(db);
    const result = await svc.ingest(baseEvent);
    expect(result.status).toBe("logged");
    expect(result.applied).toBeUndefined();
  });

  it("high confidence with auto on → orchestrator invoked", async () => {
    const { env } = await import("../../config/env.js");
    (env as { CARRIER_AUTO_TRANSITION_ENABLED: boolean }).CARRIER_AUTO_TRANSITION_ENABLED = true;

    const { OrderShipmentOrchestrator } = await import(
      "../orchestration/order-shipment-orchestrator.service.js"
    );
    const onCarrierEvent = vi.fn().mockResolvedValue(undefined);
    vi.mocked(OrderShipmentOrchestrator).mockImplementation(
      () => ({ onCarrierEvent }) as never,
    );

    const svc = new CarrierEventService(db);
    const result = await svc.ingest(baseEvent);
    expect(result.status).toBe("applied");
    expect(result.applied).toBe(true);
    expect(onCarrierEvent).toHaveBeenCalledWith(
      expect.objectContaining({ shipmentId: "ship-1", action: "load_vessel" }),
    );

    (env as { CARRIER_AUTO_TRANSITION_ENABLED: boolean }).CARRIER_AUTO_TRANSITION_ENABLED = false;
  });

  it("duplicate upsert does not create second row", async () => {
    carrierEventRecord.upsert.mockResolvedValue({ id: "rec-existing" });
    const svc = new CarrierEventService(db);
    await svc.ingest({ ...baseEvent, confidence: "low" });
    expect(carrierEventRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} }),
    );
  });
});
