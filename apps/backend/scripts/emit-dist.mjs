#!/usr/bin/env node
/**
 * Emit and flatten dist.
 *
 * `tsconfig.emit.json` sets `noEmitOnError: false` on purpose: there is a backlog of
 * type errors and tsc still produces correct JavaScript for them. Chaining tsc to the
 * flatten step with `&&` therefore skipped flattening whenever any type error existed,
 * leaving a dist with no `dist/server.js` — a build that looked finished but could not
 * boot. So tsc's exit code is reported and tolerated, and the build instead fails on
 * what actually matters: producing an artifact that runs.
 *
 * Type errors (TS2xxx+) are tolerated; syntax errors (TS1xxx) are not, because those mean
 * the emitted JavaScript itself is malformed and the service will crash-loop on boot.
 *
 * Run with `--strict` to fail on type errors too (use once the backlog is cleared).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const strict = process.argv.includes("--strict");

const tsc = spawnSync("npx", ["tsc", "-p", "tsconfig.emit.json"], {
  encoding: "utf8",
});
const tscOutput = `${tsc.stdout ?? ""}${tsc.stderr ?? ""}`;
process.stdout.write(tscOutput);

if (tsc.status !== 0) {
  const syntaxErrors = tscOutput
    .split("\n")
    .filter((line) => /error TS1\d{3}:/.test(line));

  if (syntaxErrors.length > 0) {
    console.error(
      `\n[emit-dist] ${syntaxErrors.length} syntax error(s) — the emitted JavaScript would be malformed:`,
    );
    for (const line of syntaxErrors.slice(0, 20)) console.error(`  ${line}`);
    process.exit(1);
  }

  if (strict) {
    console.error("\n[emit-dist] tsc reported type errors and --strict was set.");
    process.exit(tsc.status ?? 1);
  }
  console.warn(`\n[emit-dist] tsc exited ${tsc.status} — type errors only, emitting anyway.`);
}

const flatten = spawnSync("bash", ["scripts/flatten-dist.sh"], { stdio: "inherit" });
if (flatten.status !== 0) {
  console.error("[emit-dist] flatten-dist.sh failed.");
  process.exit(flatten.status ?? 1);
}

if (!existsSync("dist/server.js")) {
  console.error("[emit-dist] dist/server.js is missing — the build did not produce a bootable artifact.");
  process.exit(1);
}

// Parse-check every emitted module. A build that cannot even be parsed must never reach
// systemd, which would otherwise crash-loop on it.
// `node --check` accepts exactly one file — batching with `-n50` silently checks only the
// first of each batch — so this must stay at one file per process, parallelised instead.
const parseCheck = spawnSync(
  "bash",
  ["-c", "find dist -name '*.js' -print0 | xargs -0 -n1 -P8 node --check"],
  { stdio: "inherit" },
);
if (parseCheck.status !== 0) {
  console.error("[emit-dist] emitted JavaScript failed to parse — refusing to publish this dist.");
  process.exit(1);
}

console.log("[emit-dist] dist/server.js present; all emitted modules parse.");
