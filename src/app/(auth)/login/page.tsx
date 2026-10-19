import Link from "next/link";
import { redirect } from "next/navigation";

import { destinationForRole, getSessionState } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const state = await getSessionState();

  if (state.status === "active") {
    redirect(destinationForRole(state.profile.role));
  }
  if (state.status === "inactive") {
    redirect("/cuenta-desactivada");
  }

  const { error, reset } = await searchParams;

  return (
    <>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        Terminal de acceso
      </span>
      <h1 className="mt-1 mb-6 text-xl font-bold tracking-tight text-ink">
        Control de jornada
      </h1>

      {error === "session" && (
        <p className="mb-5 text-sm text-ink-dim">
          Tu sesión no era válida. Vuelve a iniciar sesión.
        </p>
      )}

      {reset === "ok" && (
        <p role="status" className="mb-5 border border-stamp bg-stamp-soft px-4 py-2 text-sm text-stamp-ink">
          Contraseña actualizada. Inicia sesión con tu nueva contraseña.
        </p>
      )}

      <LoginForm />

      <p className="mt-4 text-center text-sm">
        <Link
          href="/recuperar-contrasena"
          className="text-ink-dim underline decoration-line-strong underline-offset-4 hover:text-stamp"
        >
          ¿Has olvidado tu contraseña?
        </Link>
      </p>

      <p className="mt-6 text-center text-sm text-ink-dim">
        ¿No tienes cuenta?{" "}
        <Link
          href="/registro"
          className="text-ink underline decoration-line-strong underline-offset-4 hover:text-stamp"
        >
          Crear cuenta
        </Link>
      </p>
    </>
  );
}
