import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { isPasswordlessAllowedPath } from "./passwordless-access.policy.js";

function mockReq(method: string, originalUrl: string): Request {
  return { method, originalUrl } as Request;
}

describe("passwordless-access.policy", () => {
  it("allows conversation hub reads and writes", () => {
    expect(isPasswordlessAllowedPath(mockReq("GET", "/api/workspaces/RFQ/ws-1/conversation"))).toBe(true);
    expect(isPasswordlessAllowedPath(mockReq("POST", "/api/workspaces/RFQ/ws-1/conversation/timeline"))).toBe(true);
    expect(isPasswordlessAllowedPath(mockReq("POST", "/api/workspaces/RFQ/ws-1/conversation/attachments"))).toBe(true);
  });

  it("blocks workspace FSM routes", () => {
    expect(isPasswordlessAllowedPath(mockReq("POST", "/api/rfq/ws-1/actions/submit"))).toBe(false);
    expect(isPasswordlessAllowedPath(mockReq("GET", "/api/rfq/ws-1"))).toBe(false);
  });

  it("allows consume endpoint", () => {
    expect(isPasswordlessAllowedPath(mockReq("POST", "/api/passwordless-access/consume"))).toBe(true);
  });
});
