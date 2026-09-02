import { deriveState, type PunchState } from "@/lib/punches/state";
import type { Course, Degree, PunchType } from "@/types";

// Lógica pura: igual que en Fase 3/4, el estado de un alumno nunca se
// almacena — se deriva del último punch conocido, reutilizando exactamente
// el mismo `deriveState` que usa el alumno para sí mismo. El profesor no
// tiene "otra" definición de WORKING/OUTSIDE.

export type RosterProfile = {
  id: string;
  name: string;
  email: string;
  degree: Degree | null;
  course: Course | null;
};

export type LatestPunchByUser = Map<
  string,
  { type: PunchType; timestamp: string }
>;

export type RosterEntry = RosterProfile & {
  state: PunchState;
  lastPunchAt: string | null;
};

/** Combina perfiles + último punch de cada uno en filas de estado, sin N+1. */
export function buildRoster(
  profiles: RosterProfile[],
  latestByUser: LatestPunchByUser,
): RosterEntry[] {
  return profiles.map((profile) => {
    const latest = latestByUser.get(profile.id);
    return {
      ...profile,
      state: deriveState(latest?.type ?? null),
      lastPunchAt: latest?.timestamp ?? null,
    };
  });
}

export function countByState(roster: RosterEntry[]): {
  working: number;
  outside: number;
} {
  const working = roster.filter((r) => r.state === "WORKING").length;
  return { working, outside: roster.length - working };
}
