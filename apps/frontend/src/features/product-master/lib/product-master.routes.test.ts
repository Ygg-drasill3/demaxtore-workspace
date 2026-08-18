import { describe, expect, it } from "vitest";
import { PRODUCT_MASTER_ROUTES } from "./product-master.routes";

describe("Product Master canonical routes", () => {
  it("uses /buyer/products as the list and create path", () => {
    expect(PRODUCT_MASTER_ROUTES.list).toBe("/buyer/products");
    expect(PRODUCT_MASTER_ROUTES.create).toBe("/buyer/products/new");
    expect(PRODUCT_MASTER_ROUTES.detail("abc")).toBe("/buyer/products/abc");
  });

  it("does not introduce a parallel product architecture path", () => {
    expect(PRODUCT_MASTER_ROUTES.create.startsWith(PRODUCT_MASTER_ROUTES.list)).toBe(true);
  });
});
