import { describe, expect, it } from "vitest";
import { showQueryFatalError } from "./query-guards";

describe("showQueryFatalError", () => {
  it("shows error only when load failed without cached data", () => {
    expect(showQueryFatalError({ isLoading: false, isError: true, data: null })).toBe(true);
    expect(showQueryFatalError({ isLoading: false, isError: true, data: undefined })).toBe(true);
    expect(showQueryFatalError({ isLoading: false, isError: true, data: { id: "1" } })).toBe(false);
    expect(showQueryFatalError({ isLoading: true, isError: true, data: null })).toBe(false);
    expect(showQueryFatalError({ isLoading: false, isError: false, data: null })).toBe(false);
  });
});
