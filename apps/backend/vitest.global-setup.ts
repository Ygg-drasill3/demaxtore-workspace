/**
 * Ensures an API server is reachable before HTTP integration tests run.
 * Reuses an existing process when /api/healthz responds (local dev / CI webServer).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./src/db/prisma.js";
import { seedTestUsers } from "./src/test/fixture-users.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const apiBase = (
  process.env.TEST_API_URL
  ?? process.env.E2E_API_URL
  ?? "http://127.0.0.1:3001"
).replace(/\/$/, "");

async function healthOk(): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase}/api/healthz`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

let child: ChildProcess | null = null;

export async function setup(): Promise<void> {
  await seedTestUsers(prisma);

  if (await healthOk()) return;

  const port = new URL(apiBase).port || "3001";
  child = spawn(
    "yarn",
    ["workspace", "@dmx/backend", "exec", "tsx", "src/server.ts"],
    {
      cwd: repoRoot,
      env: { ...process.env, PORT: port, NODE_ENV: "test" },
      stdio: "pipe",
      detached: false,
    },
  );

  for (let i = 0; i < 45; i++) {
    if (await healthOk()) return;
    if (child.exitCode !== null) {
      const err = child.stderr ? await streamToString(child.stderr) : "";
      throw new Error(`Test API server exited early (code=${child.exitCode}): ${err}`);
    }
    await sleep(1000);
  }
  throw new Error(`Test API server not ready at ${apiBase}/api/healthz after 45s`);
}

export async function teardown(): Promise<void> {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await sleep(500);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
