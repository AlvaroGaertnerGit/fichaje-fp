import { describe, expect, it } from "vitest";

import {
  deriveState,
  deriveStateFromSequence,
  isValidTransition,
  nextPunchType,
} from "./state";

describe("deriveState", () => {
  it("sin punches -> OUTSIDE", () => {
    expect(deriveState(null)).toBe("OUTSIDE");
  });

  it("último punch IN -> WORKING", () => {
    expect(deriveState("IN")).toBe("WORKING");
  });

  it("último punch OUT -> OUTSIDE", () => {
    expect(deriveState("OUT")).toBe("OUTSIDE");
  });
});

describe("deriveStateFromSequence", () => {
  it("[] -> OUTSIDE", () => {
    expect(deriveStateFromSequence([])).toBe("OUTSIDE");
  });

  it("[IN] -> WORKING", () => {
    expect(deriveStateFromSequence(["IN"])).toBe("WORKING");
  });

  it("[IN, OUT] -> OUTSIDE", () => {
    expect(deriveStateFromSequence(["IN", "OUT"])).toBe("OUTSIDE");
  });

  it("[IN, OUT, IN] -> WORKING", () => {
    expect(deriveStateFromSequence(["IN", "OUT", "IN"])).toBe("WORKING");
  });

  it("[IN, OUT, IN, OUT] -> OUTSIDE", () => {
    expect(deriveStateFromSequence(["IN", "OUT", "IN", "OUT"])).toBe("OUTSIDE");
  });
});

describe("nextPunchType", () => {
  it("OUTSIDE -> IN", () => {
    expect(nextPunchType("OUTSIDE")).toBe("IN");
  });

  it("WORKING -> OUT", () => {
    expect(nextPunchType("WORKING")).toBe("OUT");
  });
});

describe("isValidTransition (espejo de check_punch_sequence)", () => {
  it("primer fichaje debe ser IN", () => {
    expect(isValidTransition(null, "IN")).toBe(true);
    expect(isValidTransition(null, "OUT")).toBe(false);
  });

  it("tras IN solo vale OUT", () => {
    expect(isValidTransition("IN", "OUT")).toBe(true);
    expect(isValidTransition("IN", "IN")).toBe(false);
  });

  it("tras OUT solo vale IN", () => {
    expect(isValidTransition("OUT", "IN")).toBe(true);
    expect(isValidTransition("OUT", "OUT")).toBe(false);
  });

  it("rechaza secuencias inválidas explícitas", () => {
    // OUT, OUT
    expect(isValidTransition("OUT", "OUT")).toBe(false);
    // IN, IN
    expect(isValidTransition("IN", "IN")).toBe(false);
  });
});
