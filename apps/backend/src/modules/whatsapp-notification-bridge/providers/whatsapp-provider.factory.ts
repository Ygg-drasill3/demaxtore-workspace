import type { WhatsAppProvider } from "./whatsapp-provider.types.js";
import { MetaCloudWhatsAppProvider } from "./meta-cloud.provider.js";
import { env } from "../../../config/env.js";

let cached: WhatsAppProvider | null = null;

export function getWhatsAppProvider(): WhatsAppProvider {
  if (cached) return cached;

  const providerId = env.WHATSAPP_BRIDGE_PROVIDER ?? "meta_cloud";
  switch (providerId) {
    case "meta_cloud":
    default:
      cached = new MetaCloudWhatsAppProvider();
      return cached;
  }
}

export function resetWhatsAppProviderForTests(): void {
  cached = null;
}
