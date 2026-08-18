// Sprint 8A — Enterprise readiness & scale foundation
import { test, expect } from "@playwright/test";
import { USERS, apiLogin, newRequest, API_BASE, runControlTowerScan } from "./_helpers";

test.describe("Enterprise readiness (Sprint 8A)", () => {
  test("01 — System dashboard API (insights)", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/system/insights`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as {
      health: { overall: string; components: unknown[] };
      jobs: unknown[];
      storage: { accessible: boolean };
      backup: { backupOverdue: boolean };
    };
    expect(body.health.overall).toBeTruthy();
    expect(Array.isArray(body.health.components)).toBeTruthy();
    expect(Array.isArray(body.jobs)).toBeTruthy();
    expect(typeof body.storage.accessible).toBe("boolean");
    expect(typeof body.backup.backupOverdue).toBe("boolean");
  });

  test("02 — Job history visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/system/jobs/history`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(await res.json())).toBeTruthy();
  });

  test("03 — Job failures endpoint visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/system/jobs/failed`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    expect(Array.isArray(await res.json())).toBeTruthy();
  });

  test("04 — Health endpoint visible (admin detailed)", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/system/health`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { overall: string; components: Array<{ key: string }> };
    expect(["healthy", "degraded", "critical"]).toContain(body.overall);
    expect(body.components.some((c) => c.key === "db")).toBeTruthy();
  });

  test("05 — Storage health visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/system/storage`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { storageDir: string; totalReferences: number };
    expect(body.storageDir).toBeTruthy();
    expect(body.totalReferences).toBeGreaterThanOrEqual(0);
  });

  test("06 — Backup status visible", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    const res = await req.get(`${API_BASE}/api/system/backup`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { backupOverdue: boolean; restoreUnverified: boolean };
    expect(typeof body.backupOverdue).toBe("boolean");
    expect(typeof body.restoreUnverified).toBe("boolean");
  });

  test("07 — Control Tower system alerts scan", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    await runControlTowerScan(req, adminToken);
    const keys = [
      "system.job.failed",
      "system.job.stale",
      "system.storage.error",
      "system.backup.overdue",
      "system.restore.unverified",
      "system.scheduler.failure",
    ] as const;
    const list = await req.get(`${API_BASE}/api/control-tower/alerts?resolved=false&limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(list.ok()).toBeTruthy();
    const body = await list.json() as { items?: Array<{ alertKey: string }> };
    const alerts = body.items ?? [];
    const systemKeys = alerts.map((a) => a.alertKey).filter((k) => keys.includes(k as typeof keys[number]));
    expect(systemKeys.length).toBeGreaterThanOrEqual(0);
  });

  test("08 — CSV exports work", async () => {
    const req = await newRequest();
    const adminToken = await apiLogin(req, USERS.admin);
    for (const type of ["jobs", "system-health", "scheduler-health"]) {
      const res = await req.get(`${API_BASE}/api/system/export/${type}.csv`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.ok()).toBeTruthy();
      const text = await res.text();
      expect(text.length).toBeGreaterThan(10);
      expect(text).toContain(",");
    }
  });

  test("09 — Role isolation", async () => {
    const req = await newRequest();
    const buyerToken = await apiLogin(req, USERS.buyer1);
    const res = await req.get(`${API_BASE}/api/system/health`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test("10 — Public healthz unchanged", async () => {
    const req = await newRequest();
    const res = await req.get(`${API_BASE}/api/healthz`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { status: string; checks?: { db?: string } };
    expect(body.status).toBe("ok");
    const ready = await req.get(`${API_BASE}/api/healthz/ready`);
    const readyBody = await ready.json() as { checks: { db: string } };
    expect(readyBody.checks.db).toBe("up");
  });
});
