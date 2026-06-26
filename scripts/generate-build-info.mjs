#!/usr/bin/env node
/**
 * Writes packages/build-info/build-info.json from git + clock.
 * Run before frontend/backend production builds.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "packages/build-info/build-info.json");

function git(cmd) {
  try {
    return execSync(cmd, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const info = {
  commitSha: git("git rev-parse HEAD") ?? "unknown",
  branch: git("git rev-parse --abbrev-ref HEAD") ?? "unknown",
  buildTime: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(info, null, 2)}\n`);
console.log(`build-info → ${info.commitSha.slice(0, 7)} (${info.branch})`);
