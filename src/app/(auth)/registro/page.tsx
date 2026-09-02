import Link from "next/link";
import { redirect } from "next/navigation";

import { destinationForRole, getSessionState } from "@/lib/auth/session";

import { RegisterForm } from "./RegisterForm";

export default async function RegistroPage() {
  const state = await getSessionState();

  if (state.status === "active") {
    redirect(destinationForRole(state.profile.role));
  }
  if (state.status === "inactive") {
    redirect("/cuenta-desactivada");
  }

  return (
    <>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        Alta de alumno
      </span>
      <h1 className="mt-1 mb-6 text-xl font-bold tracking-tight text-ink">
        Crear cuenta
      </h1>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-ink-dim">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="text-ink underline decoration-line-strong underline-offset-4 hover:text-stamp"
        >
          Iniciar sesión →
        </Link>
      </p>
    </>
  );
}
