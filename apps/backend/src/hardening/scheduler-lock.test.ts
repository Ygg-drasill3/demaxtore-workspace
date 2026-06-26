import { describe, it, expect } from "vitest";
import { withSchedulerLock } from "../db/scheduler-lock.js";

describe("Scheduler advisory lock", () => {
  it("allows only one concurrent holder", async () => {
    const testLock = 910_042n;
    let innerRuns = 0;
    let releaseFirst!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const firstTask = withSchedulerLock(testLock, async () => {
      innerRuns += 1;
      await gate;
    });

    for (let i = 0; i < 100 && innerRuns === 0; i++) {
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(innerRuns).toBe(1);

    const secondOk = await withSchedulerLock(testLock, async () => {
      innerRuns += 1;
    });
    expect(secondOk).toBe(false);
    expect(innerRuns).toBe(1);

    releaseFirst();
    const firstOk = await firstTask;
    expect(firstOk).toBe(true);

    const thirdOk = await withSchedulerLock(testLock, async () => {
      innerRuns += 1;
    });
    expect(thirdOk).toBe(true);
    expect(innerRuns).toBe(2);
  });
});
