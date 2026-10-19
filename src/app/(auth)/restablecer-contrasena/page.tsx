import { cookies } from "next/headers";
import Link from "next/link";

import { Button, buttonClassName } from "@/components/ui/button";
import { RECOVERY_COOKIE } from "@/lib/auth/password-reset";
import { createClient } from "@/lib/supabase/server";

import { cancelPasswordReset } from "./actions";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  // Solo una sesión creada por el enlace del correo (marca de /auth/confirm
  // para el mismo usuario) puede ver el formulario. Sin sesión, o con una
  // sesión de login normal, se muestra el estado de enlace no válido.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const marker = (await cookies()).get(RECOVERY_COOKIE)?.value;
  const isRecoverySession = Boolean(userId) && marker === userId;

  if (!isRecoverySession) {
    return (
      <>
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-danger">
          Enlace no válido
        </span>
        <h1 className="mt-1 mb-4 text-xl font-bold tracking-tight text-ink">
          No se puede restablecer
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-ink-dim">
          El enlace de recuperación no es válido, ha caducado o ya se ha
          utilizado. Solicita uno nuevo para cambiar tu contraseña.
        </p>
        <Link href="/recuperar-contrasena" className={buttonClassName("primary", "w-full")}>
          Solicitar enlace nuevo
        </Link>
        <p className="mt-6 text-center text-sm text-ink-dim">
          <Link
            href="/login"
            className="text-ink underline decoration-line-strong underline-offset-4 hover:text-stamp"
          >
            Volver al inicio de sesión
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        Recuperar acceso
      </span>
      <h1 className="mt-1 mb-6 text-xl font-bold tracking-tight text-ink">
        Nueva contraseña
      </h1>

      <ResetPasswordForm />

      <form action={cancelPasswordReset} className="mt-4">
        <Button type="submit" variant="ghost" className="w-full">
          Cancelar
        </Button>
      </form>
    </>
  );
}
