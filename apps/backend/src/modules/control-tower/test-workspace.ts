import type { Prisma, PrismaClient } from "@prisma/client";
import { env, isProd } from "../../config/env.js";
import { resolveTradeRoot } from "../trade/trade.resolver.js";

const TEST_PRODUCT_CATEGORY = "E2E";

const TEST_TITLE_PATTERNS = [
  /^E2E\b/i,
  /^\[TEST\]/i,
  /^PR QA\b/i,
  /^CT\s+E2E/i,
  /^Pilot\b/i,
  /^Freight\s+\d/i,
  /^TradeDocs/i,
  /^CommodityBid\s+E2E/i,
  /^Shipment\s+E2E/i,
  /^PO\s+E2E/i,
  /^Maritime\s+E2E/i,
  /^Track\s+E2E/i,
  /^Growth\s+E2E/i,
];

// Prefix-only. A trailing hex-suffix rule was too broad: real DIRECT_PO refs end in
// one (ORD-DIR-PO-…-92DE145C), so every Direct PO trade was hidden as test data.
const TEST_EXTERNAL_REF_PATTERNS = [
  /^ORD-RFQ-/i,
  /^ORD-CB-/i,
  /^ORD-DEMO-/i,
  /^SHP-ORD-/i,
  /^CB-CB-/i,
];

export function shouldExcludeTestData(): boolean {
  if (env.CONTROL_TOWER_EXCLUDE_TEST_DATA === true) return true;
  if (env.CONTROL_TOWER_EXCLUDE_TEST_DATA === false) return false;
  if (isProd) return false;
  return env.NODE_ENV === "development";
}

export function isTestExternalRef(externalRef: string | null | undefined): boolean {
  if (!externalRef) return false;
  return TEST_EXTERNAL_REF_PATTERNS.some((re) => re.test(externalRef));
}

export function isTestRfqMeta(
  title?: string | null,
  productCategory?: string | null,
): boolean {
  if (productCategory === TEST_PRODUCT_CATEGORY) return true;
  const t = title?.trim();
  if (!t) return false;
  return TEST_TITLE_PATTERNS.some((re) => re.test(t));
}

export function workspaceExcludesTestData(): Prisma.WorkspaceWhereInput {
  if (!shouldExcludeTestData()) return {};
  return {
    NOT: {
      OR: [
        { externalRef: { startsWith: "ORD-RFQ-" } },
        { externalRef: { startsWith: "ORD-CB-" } },
        { externalRef: { startsWith: "ORD-DEMO-" } },
        { externalRef: { startsWith: "SHP-ORD-" } },
        { rfqDetails: { productCategory: TEST_PRODUCT_CATEGORY } },
        { rfqDetails: { title: { startsWith: "E2E", mode: "insensitive" } } },
        { rfqDetails: { title: { startsWith: "[TEST]", mode: "insensitive" } } },
        { rfqDetails: { title: { startsWith: "CT E2E", mode: "insensitive" } } },
        { rfqDetails: { title: { startsWith: "Pilot", mode: "insensitive" } } },
      ],
    },
  };
}

export function alertExcludesTestData(testIds: string[]): Prisma.ControlTowerAlertWhereInput {
  if (!shouldExcludeTestData() || testIds.length === 0) return {};
  return {
    OR: [
      { workspaceId: null },
      { workspaceId: { notIn: testIds } },
    ],
  };
}

let cachedTestIds: { at: number; ids: string[] } | null = null;
const CACHE_MS = 60_000;

export async function getTestWorkspaceIds(db: PrismaClient): Promise<string[]> {
  if (!shouldExcludeTestData()) return [];
  const now = Date.now();
  if (cachedTestIds && now - cachedTestIds.at < CACHE_MS) return cachedTestIds.ids;

  const ids = new Set<string>();

  const byRef = await db.workspace.findMany({
    where: {
      OR: [
        { externalRef: { startsWith: "ORD-RFQ-" } },
        { externalRef: { startsWith: "ORD-CB-" } },
        { externalRef: { startsWith: "ORD-DEMO-" } },
        { externalRef: { startsWith: "SHP-ORD-" } },
      ],
    },
    select: { id: true },
    take: 5000,
  });
  for (const w of byRef) {
    ids.add(w.id);
    const root = await resolveTradeRoot(db, w.id);
    if (root) ids.add(root.id);
  }

  const e2eRfqs = await db.workspace.findMany({
    where: {
      type: "RFQ",
      OR: [
        { rfqDetails: { productCategory: TEST_PRODUCT_CATEGORY } },
        { rfqDetails: { title: { startsWith: "E2E", mode: "insensitive" } } },
        { rfqDetails: { title: { startsWith: "[TEST]", mode: "insensitive" } } },
        { rfqDetails: { title: { startsWith: "CT E2E", mode: "insensitive" } } },
        { rfqDetails: { title: { startsWith: "Pilot", mode: "insensitive" } } },
      ],
    },
    select: { id: true },
    take: 5000,
  });
  const rfqIds = e2eRfqs.map((r) => r.id);
  for (const id of rfqIds) ids.add(id);

  if (rfqIds.length > 0) {
    const spawned = await db.workspace.findMany({
      where: { spawnedFromId: { in: rfqIds } },
      select: { id: true },
      take: 10000,
    });
    for (const s of spawned) ids.add(s.id);
    const deep = await db.workspace.findMany({
      where: { spawnedFromId: { in: spawned.map((s) => s.id) } },
      select: { id: true },
      take: 10000,
    });
    for (const d of deep) ids.add(d.id);
  }

  const list = [...ids];
  cachedTestIds = { at: now, ids: list };
  return list;
}

export async function isTestWorkspace(db: PrismaClient, workspaceId: string): Promise<boolean> {
  if (!shouldExcludeTestData()) return false;
  const testIds = await getTestWorkspaceIds(db);
  if (testIds.includes(workspaceId)) return true;

  const ws = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      externalRef: true,
      spawnedFromId: true,
      rfqDetails: { select: { title: true, productCategory: true } },
    },
  });
  if (!ws) return false;
  if (isTestExternalRef(ws.externalRef)) return true;
  if (ws.rfqDetails && isTestRfqMeta(ws.rfqDetails.title, ws.rfqDetails.productCategory)) return true;
  if (ws.spawnedFromId && testIds.includes(ws.spawnedFromId)) return true;
  return false;
}

export async function resolveOpenAlertsForTestWorkspaces(db: PrismaClient): Promise<number> {
  if (!shouldExcludeTestData()) return 0;
  const testIds = await getTestWorkspaceIds(db);
  if (testIds.length === 0) return 0;

  const result = await db.controlTowerAlert.updateMany({
    where: { resolvedAt: null, workspaceId: { in: testIds } },
    data: { resolvedAt: new Date(), resolvedById: null },
  });
  cachedTestIds = null;
  return result.count;
}
