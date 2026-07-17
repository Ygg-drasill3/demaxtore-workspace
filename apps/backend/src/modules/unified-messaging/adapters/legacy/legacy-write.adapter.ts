import type { LegacyWriteAdapter } from "./legacy-adapter.types.js";

/** Phase 3: all writes remain on legacy services. */
export const legacyOnlyWriteAdapter: LegacyWriteAdapter = {
  mode: "LEGACY_ONLY",
};
