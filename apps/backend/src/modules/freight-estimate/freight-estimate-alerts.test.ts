import { describe, it, expect, vi, beforeEach } from "vitest";
import { AlertKey } from "@dmx/contracts/control-tower";

const { upsertMock } = vi.hoisted(() => ({
  upsertMock: vi.fn().mockResolvedValue(true),
}));

vi.mock("../tracking/tracking-alerts.js", () => ({
  upsertControlTowerAlert: upsertMock,
}));

import { scanFreightEstimateAlerts } from "./freight-estimate-alerts.js";

function makeDb(overrides: {
  roots?: Array<{ id: string; externalRef: string; type: string }>;
  active?: unknown;
  had?: { id: string } | null;
}) {
  return {
    freightEstimate: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi
        .fn()
        .mockResolvedValueOnce(overrides.active ?? null)
        .mockResolvedValueOnce(overrides.had ?? { id: "est-1" }),
      update: vi.fn(),
    },
    workspace: {
      findMany: vi.fn().mockResolvedValue(overrides.roots ?? []),
    },
  } as never;
}

describe("scanFreightEstimateAlerts", () => {
  beforeEach(() => {
    upsertMock.mockClear();
  });

  it("creates refresh_required alert for PO-ready workspaces without active estimate (REF-001)", async () => {
    const db = makeDb({
      roots: [{ id: "ws-1", externalRef: "RFQ-TEST", type: "RFQ" }],
      active: null,
      had: { id: "est-1" },
    });

    const created = await scanFreightEstimateAlerts(db);

    expect(created).toBe(1);
    expect(upsertMock).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        workspaceId: "ws-1",
        alertKey: AlertKey.FREIGHT_ESTIMATE_REFRESH_REQUIRED,
      }),
      { allowTestWorkspace: true },
    );
  });
});
