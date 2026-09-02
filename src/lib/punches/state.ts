import type { PunchType } from "@/types";

// Lógica pura del estado de fichaje — sin Supabase, sin Next.js, sin efectos
// secundarios. El estado NUNCA se almacena: se deriva siempre del último
// punch. Estas funciones son la única fuente de verdad sobre qué secuencia
// es válida, compartida entre la Server Action y el trigger de PostgreSQL
// (`check_punch_sequence`) — deben estar de acuerdo por construcción, no
// por convención.

export type PunchState = "OUTSIDE" | "WORKING";

/** OUTSIDE → el siguiente fichaje es IN. WORKING → el siguiente es OUT. */
export function deriveState(lastType: PunchType | null): PunchState {
  return lastType === "IN" ? "WORKING" : "OUTSIDE";
}

/** El servidor decide el tipo; el cliente solo puede pedir "quiero fichar". */
export function nextPunchType(state: PunchState): PunchType {
  return state === "WORKING" ? "OUT" : "IN";
}

/** Reduce una secuencia completa de tipos, en orden cronológico, al estado final. */
export function deriveStateFromSequence(types: PunchType[]): PunchState {
  return deriveState(types.length > 0 ? types[types.length - 1] : null);
}

/** ¿Es "type" una continuación válida tras "lastType"? Espejo del trigger SQL. */
export function isValidTransition(lastType: PunchType | null, type: PunchType): boolean {
  if (lastType === null) return type === "IN";
  return lastType === "IN" ? type === "OUT" : type === "IN";
}
