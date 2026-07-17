#!/usr/bin/env node
/**
 * Unified Messaging backfill — dry-run by default; apply requires confirm token from latest dry-run.
 */
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import type { BackfillSource } from "../src/modules/unified-messaging/messaging-backfill.service.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(scriptDir, "../.env") });

function parseArgs(argv: string[]) {
  const flags = new Set(argv);
  const get = (prefix: string) => argv.find((a) => a.startsWith(prefix))?.split("=")[1];
  const sources: BackfillSource[] = [];
  if (flags.has("--all")) sources.push("workspace", "direct", "whatsapp", "clarification");
  else {
    for (const s of ["workspace", "direct", "whatsapp", "clarification"] as BackfillSource[]) {
      if (flags.has(`--source=${s}`)) sources.push(s);
    }
  }
  if (!sources.length) sources.push("workspace");
  return {
    dryRun: flags.has("--dry-run") || !flags.has("--apply"),
    apply: flags.has("--apply"),
    confirm: get("--confirm"),
    sources,
    limit: Number(get("--limit") ?? "0") || undefined,
    conversationId: get("--conversation-id"),
    batchSize: Number(get("--batch-size") ?? "50") || 50,
    resumeFrom: get("--resume-from"),
    outputReport: get("--output-report"),
    reportFile: get("--report-file"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { PrismaClient } = await import("@prisma/client");
  const { MessagingBackfillService } = await import(
    "../src/modules/unified-messaging/messaging-backfill.service.js"
  );

  if (args.apply) {
    let expectedToken = process.env.MESSAGING_BACKFILL_CONFIRM_TOKEN;
    if (args.reportFile && existsSync(args.reportFile)) {
      const prior = JSON.parse(readFileSync(args.reportFile, "utf8")) as { confirmToken?: string };
      expectedToken = prior.confirmToken ?? expectedToken;
    }
    if (!expectedToken || args.confirm !== expectedToken) {
      console.error("Apply requires --confirm=<token> matching latest dry-run report confirmToken");
      console.error("Run: npx tsx apps/backend/scripts/messaging-backfill.ts --dry-run --all --output-report=/tmp/backfill-dry.json");
      process.exit(1);
    }
  }

  const prisma = new PrismaClient();
  const svc = new MessagingBackfillService(prisma);
  try {
    const report = await svc.run({
      sources: args.sources,
      dryRun: args.dryRun,
      limit: args.limit,
      conversationId: args.conversationId,
      batchSize: args.batchSize,
      resumeFrom: args.resumeFrom,
    });
    const json = JSON.stringify(report, null, 2);
    console.log(json);
    if (args.outputReport) {
      mkdirSync(dirname(args.outputReport), { recursive: true });
      writeFileSync(args.outputReport, json);
      console.error(`Report written to ${args.outputReport}`);
      console.error(`Apply token: ${report.confirmToken}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "backfill failed");
  process.exit(1);
});

export { parseArgs };
