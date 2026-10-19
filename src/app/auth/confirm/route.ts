import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import {
  RECOVERY_COOKIE,
  RECOVERY_COOKIE_MAX_AGE_SECONDS,
  RESET_PASSWORD_PATH,
} from "@/lib/auth/password-reset";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino del enlace del correo de recuperación. Acepta los dos formatos que
 * puede generar Supabase Auth con @supabase/ssr:
 *
 * - `?token_hash=…&type=recovery` (plantilla de email con `{{ .TokenHash }}`):
 *   se verifica con `verifyOtp`. Funciona aunque el correo se abra en otro
 *   navegador o dispositivo.
 * - `?code=…` (plantilla por defecto, `{{ .ConfirmationURL }}`, flujo PKCE):
 *   se canjea con `exchangeCodeForSession`, que necesita la cookie
 *   `code_verifier` del navegador donde se pidió la recuperación.
 *
 * Enlaces caducados, ya usados o manipulados fallan en Supabase (los tokens
 * son de un solo uso) y terminan en /recuperar-contrasena?error=enlace.
 * Nunca se registran tokens en logs, solo el código de error.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");

  const supabase = await createClient();
  let userId: string | undefined;

  if (tokenHash && type === "recovery") {
    const { data, error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });
    if (error) console.error("[auth] recovery verifyOtp failed:", error.code);
    userId = data.user?.id;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("[auth] recovery code exchange failed:", error.code);
    userId = data.user?.id;
  }

  const cookieStore = await cookies();

  if (!userId) {
    cookieStore.delete(RECOVERY_COOKIE);
    redirect("/recuperar-contrasena?error=enlace");
  }

  cookieStore.set(RECOVERY_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RECOVERY_COOKIE_MAX_AGE_SECONDS,
  });
  redirect(RESET_PASSWORD_PATH);
}
