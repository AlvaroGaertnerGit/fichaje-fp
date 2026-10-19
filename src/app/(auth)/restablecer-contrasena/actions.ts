"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  RECOVERY_COOKIE,
  validateNewPassword,
} from "@/lib/auth/password-reset";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = { error: string } | null;

const INVALID_RECOVERY_SESSION =
  "La sesión de recuperación no es válida o ha caducado. Solicita un enlace nuevo.";

/**
 * Cambia la contraseña con la sesión de recuperación (clave publishable,
 * nunca la secreta). Exige las dos cosas: un JWT válido (`getClaims`) y la
 * marca httpOnly de /auth/confirm para ESE mismo usuario. Una sesión
 * normal de login, sin haber pasado por el enlace del correo, no puede
 * usar esta acción.
 */
export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmPassword") ?? "");

  const invalid = validateNewPassword(password, confirmation);
  if (invalid) return invalid;

  const supabase = await createClient();
  const cookieStore = await cookies();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId || cookieStore.get(RECOVERY_COOKIE)?.value !== userId) {
    return { error: INVALID_RECOVERY_SESSION };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.code === "same_password") {
      return { error: "La nueva contraseña debe ser distinta de la anterior." };
    }
    if (error.code === "weak_password") {
      return { error: "La contraseña no cumple los requisitos de seguridad." };
    }
    console.error("[auth] updateUser(password) failed:", error.code);
    if (error.code === "session_expired" || error.code === "session_not_found") {
      return { error: INVALID_RECOVERY_SESSION };
    }
    return { error: "No se ha podido cambiar la contraseña. Inténtalo de nuevo." };
  }

  // Tras cambiar la contraseña se revocan TODAS las sesiones del usuario
  // (incluida la de recuperación): quien tuviera una sesión abierta con la
  // contraseña antigua deja de tenerla. Se vuelve a entrar desde /login.
  await supabase.auth.signOut({ scope: "global" });
  cookieStore.delete(RECOVERY_COOKIE);
  redirect("/login?reset=ok");
}

/** Abandona la recuperación sin cambiar nada: cierra la sesión del enlace. */
export async function cancelPasswordReset(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(RECOVERY_COOKIE);
  redirect("/login");
}
