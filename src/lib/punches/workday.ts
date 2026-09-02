import type { Punch } from "@/types";

// No existe (ni hace falta crear) una entidad `workday` en la base de
// datos: una jornada es, siempre, un par IN→OUT derivado de los punches —
// igual que el estado (Fase 3), nunca se almacena por separado.

export type Workday = {
  checkIn: string; // timestamp ISO del punch IN
  checkOut: string | null; // timestamp ISO del punch OUT, o null si sigue abierta
};

/**
 * Empareja una lista de punches (más recientes primero, como devuelve
 * `getMyPunches`) en jornadas IN→OUT, más recientes primero. Los punches
 * alternan siempre IN/OUT por construcción (RLS + trigger de secuencia), así
 * que el emparejamiento cronológico es determinista.
 */
export function pairPunchesIntoWorkdays(punchesMostRecentFirst: Punch[]): Workday[] {
  const chronological = [...punchesMostRecentFirst].reverse();
  const workdays: Workday[] = [];
  let open: Punch | null = null;

  for (const p of chronological) {
    if (p.type === "IN") {
      open = p;
    } else if (open) {
      workdays.push({ checkIn: open.timestamp, checkOut: p.timestamp });
      open = null;
    }
  }
  if (open) {
    workdays.push({ checkIn: open.timestamp, checkOut: null });
  }

  return workdays.reverse();
}

/** Duración en milisegundos, o null si la jornada sigue abierta (sin OUT). */
export function workdayDurationMs(workday: Workday): number | null {
  if (!workday.checkOut) return null;
  return new Date(workday.checkOut).getTime() - new Date(workday.checkIn).getTime();
}

/** "08:01:35" a partir de una duración en milisegundos. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
