import { env } from "../../config/env.js";
import { ManualTrackingProvider } from "./manual.provider.js";
import { MockLiveTrackingProvider } from "./mock-live.provider.js";
import { MaritimeApiTrackingProvider } from "./maritime-api.provider.js";
export function resolveTrackingProvider() {
    switch (env.TRACKING_PROVIDER) {
        case "maritime_api":
            return new MaritimeApiTrackingProvider();
        case "mock_live":
            return new MockLiveTrackingProvider();
        default:
            return new ManualTrackingProvider();
    }
}
//# sourceMappingURL=tracking.provider.js.map