"use server";

import {
  recoveryRedirectUrl,
  validateRecoveryEmail,
} from "@/lib/auth/password-reset";
import { createClient } from "@/lib/supabase/server";

export type RequestRecoveryState = { error: string } | { sent: true } | null;

/**
 * Pide a Supabase Auth el correo de recuperación. La respuesta al usuario
 * es SIEMPRE la misma ("si existe una cuenta…") tanto si el email existe
 * como si no, y también si Supabase devuelve error: un error de cooldown
 * por email ("solo puedes pedirlo cada N segundos") solo ocurre para
 * cuentas reales, así que mostrarlo revelaría que el correo está
 * registrado. El error real queda en el log de servidor (solo el código).
 */
export async function requestPasswordRecovery(
  _prevState: RequestRecoveryState,
  formData: FormData,
): Promise<RequestRecoveryState> {
  const validated = validateRecoveryEmail(String(formData.get("email") ?? ""));
  if ("error" in validated) {
    return { error: validated.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
    redirectTo: recoveryRedirectUrl(),
  });

  if (error) {
    console.error("[auth] resetPasswordForEmail failed:", error.code, error.status);
  }

  return { sent: true };
}
