// apps/backend/src/lib/build-info.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const FALLBACK = {
    commitSha: process.env.BUILD_COMMIT_SHA ?? "unknown",
    branch: process.env.BUILD_BRANCH ?? "unknown",
    buildTime: process.env.BUILD_TIME ?? new Date(0).toISOString(),
};
let cached = null;
export function getBuildInfo() {
    if (cached)
        return cached;
    try {
        const here = path.dirname(fileURLToPath(import.meta.url));
        const jsonPath = path.resolve(here, "../../../../packages/build-info/build-info.json");
        const raw = fs.readFileSync(jsonPath, "utf8");
        cached = { ...FALLBACK, ...JSON.parse(raw) };
    }
    catch {
        cached = FALLBACK;
    }
    return cached;
}
//# sourceMappingURL=build-info.js.map