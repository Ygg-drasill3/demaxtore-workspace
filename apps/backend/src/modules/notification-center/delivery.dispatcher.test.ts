import { describe, expect, it, vi, beforeEach } from "vitest";
import { scheduleNotificationChannelDeliveries } from "./delivery.dispatcher.js";

vi.mock("../../realtime/socket-bus.js", () => ({
  socketBus: { scheduleEmit: (fn: () => void) => fn() },
}));

const processEmailBridgeDelivery = vi.fn().mockResolvedValue(undefined);
const processWhatsAppBridgeDelivery = vi.fn().mockResolvedValue(undefined);

vi.mock("../whatsapp-notification-bridge/whatsapp-bridge.service.js", () => ({
  processWhatsAppBridgeDelivery: (...args: unknown[]) => processWhatsAppBridgeDelivery(...args),
}));

vi.mock("../email-notification-bridge/email-bridge.service.js", () => ({
  processEmailBridgeDelivery: (...args: unknown[]) => processEmailBridgeDelivery(...args),
}));

describe("delivery.dispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fans out one notification id to both channel bridges once", async () => {
    scheduleNotificationChannelDeliveries([{ id: "n-1", userId: "u-1" }]);
    await new Promise<void>((resolve) => { setImmediate(resolve); });
    await new Promise<void>((resolve) => { setImmediate(resolve); });
    expect(processWhatsAppBridgeDelivery).toHaveBeenCalledTimes(1);
    expect(processWhatsAppBridgeDelivery).toHaveBeenCalledWith("n-1");
    expect(processEmailBridgeDelivery).toHaveBeenCalledTimes(1);
    expect(processEmailBridgeDelivery).toHaveBeenCalledWith("n-1");
  });
});
