import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUYER_OPERATING_MODEL,
  isTurkeyImporterOperatingModel,
  resolveBuyerOperatingModel,
} from "./buyer-operating-model";

describe("resolveBuyerOperatingModel", () => {
  it("defaults missing and unknown values to INTERNATIONAL", () => {
    expect(resolveBuyerOperatingModel(undefined)).toBe(DEFAULT_BUYER_OPERATING_MODEL);
    expect(resolveBuyerOperatingModel(null)).toBe("INTERNATIONAL");
    expect(resolveBuyerOperatingModel("")).toBe("INTERNATIONAL");
    expect(resolveBuyerOperatingModel("turkey")).toBe("INTERNATIONAL");
    expect(resolveBuyerOperatingModel("BUYER")).toBe("INTERNATIONAL");
  });

  it("accepts only the explicit TURKEY_IMPORTER token", () => {
    expect(resolveBuyerOperatingModel("TURKEY_IMPORTER")).toBe("TURKEY_IMPORTER");
    expect(isTurkeyImporterOperatingModel("TURKEY_IMPORTER")).toBe(true);
    expect(isTurkeyImporterOperatingModel("INTERNATIONAL")).toBe(false);
  });
});
