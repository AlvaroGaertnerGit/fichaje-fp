import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types";

export type SessionState =
  | { status: "unauthenticated" }
  | { status: "no-profile" }
  | { status: "inactive"; profile: Profile }
  | { status: "active"; profile: Profile };

/**
 * Estado completo de la sesión actual, sin redirigir. Usa `getClaims()`
 * (verifica el JWT) en vez de `getSession()`, que no debe darse por buena en
 * código de servidor — es la recomendación actual de Supabase para proteger
 * páginas y datos de usuario.
 *
 * Nunca asume que un usuario autenticado tiene profile: una cuenta de
 * `auth.users` sin fila en `profiles` es un estado inválido y se trata como
 * tal (`no-profile`), no como un fallo silencioso.
 */
export async function getSessionState(): Promise<SessionState> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return { status: "unauthenticated" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError || !profile) return { status: "no-profile" };
  if (!profile.active) return { status: "inactive", profile };
  return { status: "active", profile };
}

/** Perfil del usuario actual si la sesión es válida (activa o inactiva), o null. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const state = await getSessionState();
  return state.status === "active" || state.status === "inactive" ? state.profile : null;
}

/** A dónde debe ir cada rol justo después de autenticarse. */
export function destinationForRole(role: UserRole): "/" | "/dashboard" {
  return role === "student" ? "/" : "/dashboard";
}

/**
 * Cierra una sesión que no tiene una fila válida en `profiles`. Un
 * `auth.users` sin profile es un estado que la aplicación no sabe operar
 * (no hay rol, no hay nombre, no hay RLS que le dé acceso a nada útil), así
 * que no lo dejamos "colgado": se revoca la sesión de servidor para que la
 * próxima visita a /login empiece limpia.
 */
export async function clearInvalidSession(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/**
 * Exige una sesión activa con uno de los roles indicados.
 *
 * - Sin sesión → /login.
 * - Sesión sin profile → se cierra la sesión y → /login (estado inválido,
 *   nunca se deja pasar).
 * - Cuenta desactivada → /cuenta-desactivada (nunca ve contenido protegido).
 * - Rol distinto al exigido → a su propio destino (nunca a /login: ya está
 *   autenticado, simplemente no pertenece a esta zona).
 *
 * Nunca sustituye a RLS — es la comprobación de servidor que decide si se
 * renderiza la página; RLS sigue siendo quien decide qué filas puede leer
 * o escribir esa sesión aunque esta función tuviera un fallo.
 */
export async function requireRole(allowed: UserRole[]): Promise<Profile> {
  const state = await getSessionState();

  if (state.status === "unauthenticated") {
    redirect("/login");
  }

  if (state.status === "no-profile") {
    await clearInvalidSession();
    redirect("/login?error=session");
  }

  if (state.status === "inactive") {
    redirect("/cuenta-desactivada");
  }

  if (!allowed.includes(state.profile.role)) {
    redirect(destinationForRole(state.profile.role));
  }

  return state.profile;
}
