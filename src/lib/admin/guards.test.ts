import { describe, expect, it } from "vitest";

import { isSelfTarget } from "./guards";

describe("isSelfTarget", () => {
  it("true cuando actor y target son el mismo id", () => {
    expect(isSelfTarget("user-1", "user-1")).toBe(true);
  });

  it("false cuando son ids distintos", () => {
    expect(isSelfTarget("user-1", "user-2")).toBe(false);
  });

  it("comparación sensible a mayúsculas (los ids son UUID, no hay normalización de caso)", () => {
    expect(isSelfTarget("USER-1", "user-1")).toBe(false);
  });
});
