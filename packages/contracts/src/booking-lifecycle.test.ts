import { describe, expect, it } from "vitest";
import {
  assertBookingTransition,
  canTransitionBooking,
  isBookingStatus,
  nextBookingStatuses,
} from "./booking-lifecycle";

describe("Sprint 32 booking lifecycle transitions", () => {
  it("accepts valid forward transitions", () => {
    expect(canTransitionBooking("DRAFT", "REQUESTED")).toBe(true);
    expect(canTransitionBooking("REQUESTED", "PENDING")).toBe(true);
    expect(canTransitionBooking("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransitionBooking("CONFIRMED", "AMENDED")).toBe(true);
    expect(canTransitionBooking("PENDING", "CANCELLED")).toBe(true);
    expect(canTransitionBooking("CONFIRMED", "CANCELLED")).toBe(true);
  });

  it("treats null legacy status as DRAFT entrypoint", () => {
    expect(canTransitionBooking(null, "REQUESTED")).toBe(true);
    expect(canTransitionBooking(null, "DRAFT")).toBe(true);
    expect(canTransitionBooking(undefined, "CONFIRMED")).toBe(true);
  });

  it("rejects invalid transitions including reopen from CANCELLED", () => {
    expect(canTransitionBooking("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransitionBooking("CANCELLED", "DRAFT")).toBe(false);
    expect(canTransitionBooking("PENDING", "DRAFT")).toBe(false);
    expect(canTransitionBooking("REQUESTED", "AMENDED")).toBe(false);
    expect(() => assertBookingTransition("CANCELLED", "CONFIRMED")).toThrow(
      /INVALID_BOOKING_TRANSITION/,
    );
  });

  it("is idempotent for same-status transitions", () => {
    expect(canTransitionBooking("CONFIRMED", "CONFIRMED")).toBe(true);
    expect(canTransitionBooking("CANCELLED", "CANCELLED")).toBe(true);
  });

  it("recognizes booking status values", () => {
    expect(isBookingStatus("DRAFT")).toBe(true);
    expect(isBookingStatus("BOOKING_PENDING")).toBe(false);
    expect(isBookingStatus(null)).toBe(false);
  });

  it("lists Ops next statuses without Cancel", () => {
    expect(nextBookingStatuses("REQUESTED")).toEqual(["PENDING", "CONFIRMED"]);
    expect(nextBookingStatuses("PENDING")).toEqual(["CONFIRMED"]);
    expect(nextBookingStatuses(null)).toEqual(["REQUESTED", "PENDING", "CONFIRMED"]);
  });
});
