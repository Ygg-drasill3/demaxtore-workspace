import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptSecret } from "../../lib/secret-crypto.js";
import {
  assertMediaCredentialTenant,
  resolveMediaAccessCredentials,
} from "./whatsapp-business-media.resolver.js";

const TOKEN_A = "token-buyer-a-secret";
const TOKEN_B = "token-buyer-b-secret";
const PHONE_A = "111111111111111";
const PHONE_B = "222222222222222";

vi.mock("../../config/env.js", () => ({
  env: {
    WHATSAPP_SENDER_MODE: "buyer_connection",
    WHATSAPP_ACCESS_TOKEN: "platform-token-should-not-be-used",
    WHATSAPP_PHONE_NUMBER_ID: "platform-phone",
    WHATSAPP_API_VERSION: "v21.0",
    WHATSAPP_CONNECTION_ENCRYPTION_KEY: "test-whatsapp-connection-encryption-key-32chars",
  },
  isBuyerConnectionWhatsAppMode: () => true,
  isProd: false,
}));

vi.mock("../../config/logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../lib/file-storage.js", () => ({
  writeStoredFile: vi.fn().mockResolvedValue({ storageKey: "wa-media/test.pdf" }),
}));

global.fetch = vi.fn();

function connectionRow(overrides: Record<string, unknown>) {
  return {
    id: "conn-1",
    buyerId: "buyer-a",
    phoneNumberId: PHONE_A,
    encryptedAccessToken: encryptSecret(TOKEN_A),
    status: "CONNECTED",
    tokenExpiresAt: new Date(Date.now() + 86400000),
    ...overrides,
  };
}

describe("tenant-aware inbound media", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: "https://cdn.meta.example/media", mime_type: "image/jpeg" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      } as Response);
  });

  it("PHONE_A webhook resolves TOKEN_A for media fetch", async () => {
    const prisma = {
      whatsAppBusinessConnection: {
        findUnique: vi.fn().mockResolvedValue(connectionRow({})),
        update: vi.fn(),
      },
    };

    const creds = await resolveMediaAccessCredentials(prisma as never, PHONE_A);
    expect(creds?.accessToken).toBe(TOKEN_A);
    expect(creds?.phoneNumberId).toBe(PHONE_A);

    const { downloadWhatsAppMedia } = await import("../whatsapp-inbox/whatsapp-inbox.media.js");
    await downloadWhatsAppMedia(prisma as never, "media-123", { phoneNumberId: PHONE_A, mimeType: "image/jpeg" });

    const firstCall = vi.mocked(fetch).mock.calls[0]!;
    expect(String(firstCall[0])).toContain("/media-123");
    expect((firstCall[1] as RequestInit)?.headers).toMatchObject({
      Authorization: `Bearer ${TOKEN_A}`,
    });
  });

  it("PHONE_B webhook resolves TOKEN_B for media fetch", async () => {
    const prisma = {
      whatsAppBusinessConnection: {
        findUnique: vi.fn().mockResolvedValue(
          connectionRow({
            id: "conn-b",
            buyerId: "buyer-b",
            phoneNumberId: PHONE_B,
            encryptedAccessToken: encryptSecret(TOKEN_B),
          }),
        ),
        update: vi.fn(),
      },
    };

    const creds = await resolveMediaAccessCredentials(prisma as never, PHONE_B);
    expect(creds?.accessToken).toBe(TOKEN_B);
    expect(creds?.accessToken).not.toBe(TOKEN_A);
  });

  it("blocks cross-tenant media credential use", () => {
    expect(() =>
      assertMediaCredentialTenant(
        { accessToken: TOKEN_B, buyerId: "buyer-b", phoneNumberId: PHONE_B, connectionId: "c2" },
        "buyer-a",
      ),
    ).toThrow("WHATSAPP_MEDIA_CREDENTIAL_ISOLATION");
  });

  it("DISCONNECTED connection does not download media", async () => {
    const prisma = {
      whatsAppBusinessConnection: {
        findUnique: vi.fn().mockResolvedValue(connectionRow({ status: "DISCONNECTED" })),
        update: vi.fn(),
      },
    };

    const creds = await resolveMediaAccessCredentials(prisma as never, PHONE_A);
    expect(creds).toBeNull();

    const { downloadWhatsAppMedia } = await import("../whatsapp-inbox/whatsapp-inbox.media.js");
    const result = await downloadWhatsAppMedia(prisma as never, "media-456", { phoneNumberId: PHONE_A });
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("REVOKED connection does not download media", async () => {
    const prisma = {
      whatsAppBusinessConnection: {
        findUnique: vi.fn().mockResolvedValue(connectionRow({ status: "REVOKED" })),
        update: vi.fn(),
      },
    };

    const creds = await resolveMediaAccessCredentials(prisma as never, PHONE_A);
    expect(creds).toBeNull();
  });

  it("does not expose token in fetch error logs", async () => {
    const prisma = {
      whatsAppBusinessConnection: {
        findUnique: vi.fn().mockResolvedValue(connectionRow({})),
        update: vi.fn(),
      },
    };

    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response);

    const { downloadWhatsAppMedia } = await import("../whatsapp-inbox/whatsapp-inbox.media.js");
    const result = await downloadWhatsAppMedia(prisma as never, "media-789", { phoneNumberId: PHONE_A });
    expect(result).toBeNull();

    const { logger } = await import("../../config/logger.js");
    const warnCalls = vi.mocked(logger.warn).mock.calls.flat().join(" ");
    expect(warnCalls).not.toContain(TOKEN_A);
  });
});
