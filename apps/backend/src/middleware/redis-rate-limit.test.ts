import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { EventEmitter } from "node:events";

const state = {
  counts: new Map<string, number>(),
  incrCalls: [] as string[],
};

vi.mock("../lib/redis.js", () => ({
  redisUrl: () => "redis://127.0.0.1:6379",
  redisIncrWindow: vi.fn(async (key: string) => {
    state.incrCalls.push(key);
    const next = (state.counts.get(key) ?? 0) + 1;
    state.counts.set(key, next);
    return next;
  }),
  redisWindowCount: vi.fn(async (key: string) => state.counts.get(key) ?? 0),
}));

vi.mock("../lib/security-audit.js", () => ({ logSecurityEvent: vi.fn() }));
vi.mock("../config/logger.js", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock("./e2e-bypass.js", () => ({ isValidE2eBypass: () => false }));

const { createRedisRateLimiter, submittedEmailKey } = await import("./redis-rate-limit.js");

/** Minimal Express double: `finish` is what the failures-only limiter hooks. */
function makeReqRes(body: unknown = {}) {
  const req = {
    headers: {},
    ip: "203.0.113.9",
    body,
  } as unknown as Request;

  const emitter = new EventEmitter();
  const res = Object.assign(emitter, {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json: vi.fn(),
  }) as unknown as Response & { headers: Record<string, string>; json: ReturnType<typeof vi.fn> };

  return { req, res };
}

/** Run the limiter and settle its internal promise chain. */
async function run(
  limiter: ReturnType<typeof createRedisRateLimiter>,
  req: Request,
  res: Response,
): Promise<boolean> {
  let passed = false;
  limiter(req, res, () => {
    passed = true;
  });
  await vi.waitFor(() => {
    if (!passed && !(res as unknown as { json: ReturnType<typeof vi.fn> }).json.mock.calls.length) {
      throw new Error("pending");
    }
  });
  return passed;
}

beforeEach(() => {
  state.counts.clear();
  state.incrCalls = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("countFailuresOnly rate limiting", () => {
  const limiter = () =>
    createRedisRateLimiter({
      keyPrefix: "auth-login",
      windowMs: 15 * 60_000,
      max: 3,
      countFailuresOnly: true,
    });

  it("does not charge the budget for a successful request", async () => {
    const l = limiter();
    for (let i = 0; i < 10; i++) {
      const { req, res } = makeReqRes();
      expect(await run(l, req, res)).toBe(true);
      res.statusCode = 200;
      (res as unknown as EventEmitter).emit("finish");
    }
    expect(state.incrCalls).toHaveLength(0);
    expect(state.counts.size).toBe(0);
  });

  it("charges the budget for a failed request", async () => {
    const l = limiter();
    const { req, res } = makeReqRes();
    expect(await run(l, req, res)).toBe(true);
    res.statusCode = 401;
    (res as unknown as EventEmitter).emit("finish");
    await vi.waitFor(() => expect(state.incrCalls).toHaveLength(1));
    expect(state.counts.get("rl:auth-login:203.0.113.9")).toBe(1);
  });

  it("rejects with 429 once the failure budget is spent", async () => {
    const l = limiter();
    for (let i = 0; i < 3; i++) {
      const { req, res } = makeReqRes();
      expect(await run(l, req, res)).toBe(true);
      res.statusCode = 401;
      (res as unknown as EventEmitter).emit("finish");
      await vi.waitFor(() => expect(state.incrCalls).toHaveLength(i + 1));
    }

    const { req, res } = makeReqRes();
    expect(await run(l, req, res)).toBe(false);
    expect(res.statusCode).toBe(429);
    expect((res as unknown as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith({
      error: { code: "RATE_LIMITED", message: "Too many requests" },
    });
  });

  it("a successful login is still served while failures are accumulating", async () => {
    const l = limiter();
    const fail = makeReqRes();
    expect(await run(l, fail.req, fail.res)).toBe(true);
    fail.res.statusCode = 401;
    (fail.res as unknown as EventEmitter).emit("finish");
    await vi.waitFor(() => expect(state.incrCalls).toHaveLength(1));

    const ok = makeReqRes();
    expect(await run(l, ok.req, ok.res)).toBe(true);
    expect(ok.res.headers["X-RateLimit-Remaining"]).toBe("2");
  });

  it("exposes the remaining failure budget in headers", async () => {
    const l = limiter();
    const { req, res } = makeReqRes();
    await run(l, req, res);
    expect(res.headers["X-RateLimit-Limit"]).toBe("3");
    expect(res.headers["X-RateLimit-Remaining"]).toBe("3");
  });
});

describe("submittedEmailKey", () => {
  it("buckets by the submitted email so rotating IPs cannot widen the budget", () => {
    const { req } = makeReqRes({ email: "Buyer@Dema.Test" });
    expect(submittedEmailKey(req)).toBe("email:buyer@dema.test");
  });

  it("falls back to the IP bucket when no usable email is supplied", () => {
    expect(submittedEmailKey(makeReqRes({}).req)).toBe("ip:203.0.113.9");
    expect(submittedEmailKey(makeReqRes({ email: "not-an-email" }).req)).toBe("ip:203.0.113.9");
    expect(submittedEmailKey(makeReqRes(undefined).req)).toBe("ip:203.0.113.9");
  });
});

describe("volume limiting (default mode) is unchanged", () => {
  it("charges every request regardless of outcome", async () => {
    const l = createRedisRateLimiter({
      keyPrefix: "api-global",
      windowMs: 60_000,
      max: 2,
    });
    const a = makeReqRes();
    expect(await run(l, a.req, a.res)).toBe(true);
    const b = makeReqRes();
    expect(await run(l, b.req, b.res)).toBe(true);

    const c = makeReqRes();
    expect(await run(l, c.req, c.res)).toBe(false);
    expect(c.res.statusCode).toBe(429);
    expect(state.incrCalls).toHaveLength(3);
  });
});
