import { describe, expect, it } from "vitest";

import { buildRoster, countByState, type RosterProfile } from "./roster";

function profile(id: string, name: string): RosterProfile {
  return { id, name, email: `${id}@fp.test`, degree: "SMR", course: "2" };
}

describe("buildRoster", () => {
  it("alumno sin punches -> OUTSIDE, lastPunchAt null", () => {
    const roster = buildRoster([profile("u1", "Ana")], new Map());
    expect(roster).toEqual([
      {
        id: "u1",
        name: "Ana",
        email: "u1@fp.test",
        degree: "SMR",
        course: "2",
        state: "OUTSIDE",
        lastPunchAt: null,
      },
    ]);
  });

  it("último punch IN -> WORKING", () => {
    const latest = new Map([
      ["u1", { type: "IN" as const, timestamp: "2026-09-02T08:00:00.000Z" }],
    ]);
    const roster = buildRoster([profile("u1", "Ana")], latest);
    expect(roster[0].state).toBe("WORKING");
    expect(roster[0].lastPunchAt).toBe("2026-09-02T08:00:00.000Z");
  });

  it("último punch OUT -> OUTSIDE", () => {
    const latest = new Map([
      ["u1", { type: "OUT" as const, timestamp: "2026-09-02T14:00:00.000Z" }],
    ]);
    const roster = buildRoster([profile("u1", "Ana")], latest);
    expect(roster[0].state).toBe("OUTSIDE");
  });

  it("no confunde punches de otros alumnos", () => {
    const latest = new Map([
      ["u2", { type: "IN" as const, timestamp: "2026-09-02T08:00:00.000Z" }],
    ]);
    const roster = buildRoster([profile("u1", "Ana")], latest);
    expect(roster[0].state).toBe("OUTSIDE");
    expect(roster[0].lastPunchAt).toBeNull();
  });
});

describe("countByState", () => {
  it("cuenta WORKING vs OUTSIDE sin recorrer dos veces con lógica distinta", () => {
    const roster = buildRoster(
      [profile("u1", "Ana"), profile("u2", "Bea"), profile("u3", "Cris")],
      new Map([
        ["u1", { type: "IN" as const, timestamp: "2026-09-02T08:00:00.000Z" }],
        ["u2", { type: "OUT" as const, timestamp: "2026-09-02T08:00:00.000Z" }],
      ]),
    );
    expect(countByState(roster)).toEqual({ working: 1, outside: 2 });
  });

  it("roster vacío -> ceros", () => {
    expect(countByState([])).toEqual({ working: 0, outside: 0 });
  });
});
