import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Punch } from "@/types";

import { deriveState, type PunchState } from "./state";

/**
 * Estado actual derivado del último punch de `userId`.
 *
 * Uso interno: `userId` debe proceder siempre de una sesión ya validada en
 * el propio servidor (nunca de un parámetro de cliente) — esta función no
 * vuelve a comprobar la sesión, confía en que quien la llama ya lo hizo.
 * RLS sigue aplicando de todas formas: si `userId` no coincide con
 * `auth.uid()` de la sesión activa (o el llamante no es staff), la consulta
 * simplemente no vería filas.
 */
export async function getCurrentPunchState(
  userId: string
): Promise<{ state: PunchState; lastPunch: Punch | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("punches")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo determinar el estado de fichaje.");
  }

  return { state: deriveState(data?.type ?? null), lastPunch: data };
}

/**
 * Los fichajes del usuario autenticado actual, y solo los suyos — deriva la
 * identidad de la sesión de servidor, no acepta ningún id como parámetro.
 * Da igual el rol de quien llama: "mis fichajes" significa siempre los
 * propios, nunca los de otro alumno aunque quien llame sea profesor/admin.
 *
 * `offset` pagina en unidades de punch (no de jornada); el historial pide
 * siempre múltiplos de 2 para no partir una jornada IN/OUT entre páginas.
 */
export async function getMyPunches(limit = 10, offset = 0): Promise<Punch[]> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return [];

  const { data, error } = await supabase
    .from("punches")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return [];
  return data ?? [];
}
