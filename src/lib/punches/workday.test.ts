import { describe, expect, it } from "vitest";

import { formatDuration, pairPunchesIntoWorkdays, workdayDurationMs } from "./workday";
import type { Punch } from "@/types";

function punch(id: string, type: "IN" | "OUT", timestamp: string): Punch {
  return {
    id,
    user_id: "u1",
    type,
    timestamp,
    ip_address: null,
    user_agent: null,
    created_at: timestamp,
  };
}

describe("pairPunchesIntoWorkdays", () => {
  it("sin punches -> []", () => {
    expect(pairPunchesIntoWorkdays([])).toEqual([]);
  });

  it("una jornada completa (más reciente primero, como getMyPunches)", () => {
    const punches = [
      punch("2", "OUT", "2026-09-02T14:00:00.000Z"),
      punch("1", "IN", "2026-09-02T08:00:00.000Z"),
    ];
    expect(pairPunchesIntoWorkdays(punches)).toEqual([
      { checkIn: "2026-09-02T08:00:00.000Z", checkOut: "2026-09-02T14:00:00.000Z" },
    ]);
  });

  it("jornada abierta (IN sin OUT) queda con checkOut: null", () => {
    const punches = [punch("1", "IN", "2026-09-02T08:00:00.000Z")];
    expect(pairPunchesIntoWorkdays(punches)).toEqual([
      { checkIn: "2026-09-02T08:00:00.000Z", checkOut: null },
    ]);
  });

  it("varias jornadas, orden más reciente primero preservado", () => {
    const punches = [
      punch("4", "OUT", "2026-09-02T14:00:00.000Z"),
      punch("3", "IN", "2026-09-02T08:00:00.000Z"),
      punch("2", "OUT", "2026-09-01T14:05:00.000Z"),
      punch("1", "IN", "2026-09-01T08:02:00.000Z"),
    ];
    const result = pairPunchesIntoWorkdays(punches);
    expect(result).toHaveLength(2);
    expect(result[0].checkIn).toBe("2026-09-02T08:00:00.000Z"); // la más reciente primero
    expect(result[1].checkIn).toBe("2026-09-01T08:02:00.000Z");
  });
});

describe("workdayDurationMs / formatDuration", () => {
  it("jornada abierta -> duración null", () => {
    expect(workdayDurationMs({ checkIn: "2026-09-02T08:00:00.000Z", checkOut: null })).toBeNull();
  });

  it("calcula la duración exacta de una jornada completa", () => {
    const ms = workdayDurationMs({
      checkIn: "2026-09-02T09:03:17.000Z",
      checkOut: "2026-09-02T17:04:52.000Z",
    });
    expect(ms).toBe((8 * 3600 + 1 * 60 + 35) * 1000);
  });

  it("formatDuration -> HH:MM:SS", () => {
    expect(formatDuration((8 * 3600 + 1 * 60 + 35) * 1000)).toBe("08:01:35");
    expect(formatDuration(0)).toBe("00:00:00");
    expect(formatDuration(59 * 1000)).toBe("00:00:59");
  });
});
