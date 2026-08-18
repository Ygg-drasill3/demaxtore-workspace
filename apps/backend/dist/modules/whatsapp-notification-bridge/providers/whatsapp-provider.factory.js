import { MetaCloudWhatsAppProvider } from "./meta-cloud.provider.js";
import { env } from "../../../config/env.js";
let cached = null;
export function getWhatsAppProvider() {
    if (cached)
        return cached;
    const providerId = env.WHATSAPP_BRIDGE_PROVIDER ?? "meta_cloud";
    switch (providerId) {
        case "meta_cloud":
        default:
            cached = new MetaCloudWhatsAppProvider();
            return cached;
    }
}
export function resetWhatsAppProviderForTests() {
    cached = null;
}
//# sourceMappingURL=whatsapp-provider.factory.js.map