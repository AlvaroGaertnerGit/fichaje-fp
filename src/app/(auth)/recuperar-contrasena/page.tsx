import Link from "next/link";

import { RecoveryRequestForm } from "./RecoveryRequestForm";

export default async function PasswordRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        Recuperar acceso
      </span>
      <h1 className="mt-1 mb-4 text-xl font-bold tracking-tight text-ink">
        ¿Has olvidado tu contraseña?
      </h1>

      {error === "enlace" ? (
        <p role="alert" className="mb-5 border border-danger bg-danger-soft px-4 py-2 text-sm text-danger">
          El enlace no es válido, ha caducado o ya se ha utilizado. Solicita
          uno nuevo.
        </p>
      ) : (
        <p className="mb-6 text-sm leading-relaxed text-ink-dim">
          Introduce tu correo y te enviaremos un enlace para elegir una
          contraseña nueva.
        </p>
      )}

      <RecoveryRequestForm />

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
