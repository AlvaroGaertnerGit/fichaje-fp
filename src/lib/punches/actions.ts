"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { clearInvalidSession, getSessionState } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, isAllowedNetwork } from "@/lib/network/allowed-ip";
import type { PunchType } from "@/types";

import { getCurrentPunchState } from "./queries";
import { deriveState, nextPunchType, type PunchState } from "./state";

// Ventana mínima entre dos fichajes del mismo alumno. No es una defensa de
// seguridad (esa es la BD: RLS + trigger de secuencia + advisory lock) sino
// una protección barata contra doble-click/spam, calculada sobre un dato
// que ya leemos igualmente — cero infraestructura nueva. Deliberadamente
// NO usamos un limitador en memoria: en un entorno serverless (Vercel) cada
// invocación puede caer en una instancia distinta, así que un contador en
// memoria no sería fiable. Este chequeo, basado en `created_at` ya
// persistido, sí lo es.
const MIN_MS_BETWEEN_PUNCHES = 2000;

export type PunchErrorCode =
  | "UNAUTHENTICATED"
  | "NO_PROFILE"
  | "INACTIVE"
  | "FORBIDDEN_ROLE"
  | "NETWORK_UNKNOWN"
  | "NETWORK_NOT_ALLOWED"
  | "TOO_SOON"
  | "INVALID_STATE"
  | "DATABASE_ERROR";

const ERROR_MESSAGES: Record<PunchErrorCode, string> = {
  UNAUTHENTICATED: "Tu sesión no es válida. Vuelve a iniciar sesión.",
  NO_PROFILE: "Tu sesión no es válida. Vuelve a iniciar sesión.",
  INACTIVE: "Tu cuenta está desactivada. Contacta con administración.",
  FORBIDDEN_ROLE: "Tu cuenta no puede registrar fichajes.",
  NETWORK_UNKNOWN: "No se ha podido comprobar tu red. Inténtalo de nuevo desde un ordenador del centro.",
  NETWORK_NOT_ALLOWED:
    "No puedes fichar desde esta red. Conéctate a la red del centro para registrar tu jornada.",
  TOO_SOON: "Espera unos segundos antes de volver a fichar.",
  INVALID_STATE: "Tu estado ha cambiado. Actualiza la página e inténtalo de nuevo.",
  DATABASE_ERROR: "No se ha podido registrar el fichaje. Inténtalo de nuevo.",
};

export type PunchResult =
  | { success: true; id: string; type: PunchType; state: PunchState; timestamp: string }
  | { success: false; code: PunchErrorCode; message: string };

function deny(code: PunchErrorCode): PunchResult {
  return { success: false, code, message: ERROR_MESSAGES[code] };
}

/**
 * Registra un fichaje para el alumno autenticado. El cliente no envía NADA
 * salvo la intención de fichar: identidad, tipo (IN/OUT), timestamp, IP y
 * user_agent los decide siempre el servidor. Ver capas de protección:
 *
 *   UI (deshabilitar botón)          → solo UX, no seguridad
 *   esta Server Action               → sesión, rol, red, "quién soy"
 *   RLS (punches_insert_own)         → user_id = auth.uid() AND role = student
 *   trigger check_punch_sequence     → secuencia válida, con advisory lock
 *                                       por user_id (protege la concurrencia)
 *
 * Cualquiera de las capas inferiores rechaza la operación aunque esta
 * función tuviera un fallo.
 */
export async function punch(): Promise<PunchResult> {
  // 1-4: sesión, perfil, cuenta activa, rol. Nunca se acepta nada de esto
  // desde el cliente: sale entero de la sesión verificada en servidor.
  const session = await getSessionState();

  if (session.status === "unauthenticated") {
    return deny("UNAUTHENTICATED");
  }
  if (session.status === "no-profile") {
    await clearInvalidSession();
    return deny("NO_PROFILE");
  }
  if (session.status === "inactive") {
    return deny("INACTIVE");
  }

  const { profile } = session;
  if (profile.role !== "student") {
    return deny("FORBIDDEN_ROLE");
  }

  // 5: red autorizada. Sin poder determinar la IP con fiabilidad, se
  // deniega (fail closed) — nunca "no sé la IP → permito fichar".
  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  if (!ip) {
    return deny("NETWORK_UNKNOWN");
  }
  if (!isAllowedNetwork(ip)) {
    return deny("NETWORK_NOT_ALLOWED");
  }

  // 6: estado actual (deriva de los punches, nunca de un campo redundante)
  // + protección barata de doble-click sobre el mismo dato ya leído.
  const { state: currentState, lastPunch } = await getCurrentPunchState(profile.id);

  if (lastPunch) {
    const elapsedMs = Date.now() - new Date(lastPunch.created_at).getTime();
    if (elapsedMs < MIN_MS_BETWEEN_PUNCHES) {
      return deny("TOO_SOON");
    }
  }

  const type = nextPunchType(currentState);

  // 7: insertar. El servidor decide `type`; `user_id`, `ip_address` y
  // `user_agent` proceden del servidor/request; `timestamp`/`created_at`
  // los pone PostgreSQL (`default now()`), nunca un valor del cliente.
  const supabase = await createClient();
  const userAgent = hdrs.get("user-agent");

  const { data: newPunch, error } = await supabase
    .from("punches")
    .insert({
      user_id: profile.id,
      type,
      ip_address: ip,
      user_agent: userAgent,
    })
    .select("id, type, timestamp")
    .single();

  if (error) {
    if (error.code === "23514") {
      // El trigger de secuencia (con pg_advisory_xact_lock) detectó que el
      // estado cambió entre nuestra lectura y el insert — perdimos una
      // carrera contra otra petición concurrente del mismo alumno. Esto es
      // exactamente lo que debe pasar con dos clicks/pestañas simultáneas:
      // gana una, la otra se rechaza limpiamente.
      return deny("INVALID_STATE");
    }
    console.error("[punches] insert failed:", error.code, error.message);
    return deny("DATABASE_ERROR");
  }

  revalidatePath("/");
  revalidatePath("/historial");

  return {
    success: true,
    id: newPunch.id,
    type: newPunch.type,
    state: deriveState(newPunch.type),
    timestamp: newPunch.timestamp,
  };
}

/**
 * Lectura pura del estado real, sin mutar nada — pensada para que el
 * cliente reconcilie tras un fallo de RED (no de servidor) al fichar: si la
 * petición de `punch()` se pierde en tránsito, el punch puede haberse
 * creado igualmente en el servidor. En vez de reintentar `punch()` a
 * ciegas (podría duplicar el fichaje), la UI llama a esto para preguntar
 * "¿cuál es mi estado real ahora mismo?" — es idempotente, se puede llamar
 * tantas veces como haga falta sin ningún efecto secundario.
 */
export async function refreshPunchStatus(): Promise<
  { ok: true; state: PunchState; timestamp: string | null } | { ok: false }
> {
  const session = await getSessionState();
  if (session.status !== "active" || session.profile.role !== "student") {
    return { ok: false };
  }

  const { state, lastPunch } = await getCurrentPunchState(session.profile.id);
  return { ok: true, state, timestamp: lastPunch?.timestamp ?? null };
}
