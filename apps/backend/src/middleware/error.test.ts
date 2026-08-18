import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { errorHandler } from "./error.js";

describe("errorHandler", () => {
  it("delegates to next when response headers were already sent", () => {
    const res = {
      headersSent: true,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;
    const err = new Error("late failure");

    errorHandler(err, {} as Request, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  function run(err: unknown) {
    const res = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const req = { headers: {}, originalUrl: "/api/orders/not-a-uuid" } as unknown as Request;
    errorHandler(err, req, res, vi.fn() as NextFunction);
    return res;
  }

  it("maps a malformed UUID path param to 404 instead of 500", () => {
    const err = Object.assign(new Error("Inconsistent column data: Error creating UUID, invalid character"), {
      code: "P2023",
    });

    const res = run(err);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("keeps genuine column corruption as 500", () => {
    const err = Object.assign(
      new Error('Error converting field "parentWorkspaceId" of expected non-nullable type'),
      { code: "P2023" },
    );

    const res = run(err);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
