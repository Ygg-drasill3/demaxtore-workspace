import { describe, it, expect } from "vitest";
import { parseInboundMessages, parseStatusUpdates } from "./whatsapp-inbox.parser.js";

const baseWebhook = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "1745589496717695",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "905518659442",
              phone_number_id: "1221373704390497",
            },
            contacts: [{ profile: { name: "Test User" }, wa_id: "905321234567" }],
            messages: [],
            statuses: [],
          },
        },
      ],
    },
  ],
};

describe("whatsapp-inbox.parser", () => {
  it("parses incoming text message", () => {
    const body = {
      ...baseWebhook,
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                ...baseWebhook.entry[0].changes[0].value,
                messages: [
                  {
                    from: "905321234567",
                    id: "wamid.inbound1",
                    timestamp: "1710000000",
                    type: "text",
                    text: { body: "Merhaba DeMaxtore test" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const items = parseInboundMessages(body);
    expect(items).toHaveLength(1);
    expect(items[0].body).toBe("Merhaba DeMaxtore test");
    expect(items[0].profileName).toBe("Test User");
    expect(items[0].phoneNumberId).toBe("1221373704390497");
  });

  it("parses incoming image message with media id", () => {
    const body = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                messages: [
                  {
                    from: "905321234567",
                    id: "wamid.img1",
                    timestamp: "1710000001",
                    type: "image",
                    image: { id: "media123", mime_type: "image/jpeg", caption: "photo" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const items = parseInboundMessages(body);
    expect(items[0].type).toBe("image");
    expect(items[0].mediaId).toBe("media123");
    expect(items[0].caption).toBe("photo");
  });

  it("parses status updates", () => {
    const body = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                statuses: [
                  {
                    id: "wamid.out1",
                    status: "delivered",
                    timestamp: "1710000002",
                    recipient_id: "905321234567",
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const statuses = parseStatusUpdates(body);
    expect(statuses).toHaveLength(1);
    expect(statuses[0].status).toBe("delivered");
    expect(statuses[0].metaMessageId).toBe("wamid.out1");
  });

  it("parses failed status with error", () => {
    const body = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                statuses: [
                  {
                    id: "wamid.fail1",
                    status: "failed",
                    timestamp: "1710000003",
                    errors: [{ code: 131047, title: "Re-engagement", message: "Window closed" }],
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const statuses = parseStatusUpdates(body);
    expect(statuses[0].status).toBe("failed");
    expect(statuses[0].errorCode).toBe("131047");
  });

  it("returns empty for malformed payload", () => {
    expect(parseInboundMessages({})).toEqual([]);
    expect(parseStatusUpdates({ foo: "bar" })).toEqual([]);
  });
});
