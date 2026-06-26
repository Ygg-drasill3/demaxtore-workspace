// apps/backend/src/lib/build-info.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface BuildInfo {
  commitSha: string;
  branch: string;
  buildTime: string;
}

const FALLBACK: BuildInfo = {
  commitSha: process.env.BUILD_COMMIT_SHA ?? "unknown",
  branch: process.env.BUILD_BRANCH ?? "unknown",
  buildTime: process.env.BUILD_TIME ?? new Date(0).toISOString(),
};

let cached: BuildInfo | null = null;

export function getBuildInfo(): BuildInfo {
  if (cached) return cached;
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const jsonPath = path.resolve(here, "../../../../packages/build-info/build-info.json");
    const raw = fs.readFileSync(jsonPath, "utf8");
    cached = { ...FALLBACK, ...JSON.parse(raw) as BuildInfo };
  } catch {
    cached = FALLBACK;
  }
  return cached;
}
