import { redirect } from "next/navigation";

import { logout } from "@/lib/auth/actions";
import { clearInvalidSession, destinationForRole, getSessionState } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export default async function AccountDisabledPage() {
  const state = await getSessionState();

  if (state.status === "unauthenticated") {
    redirect("/login");
  }
  if (state.status === "no-profile") {
    await clearInvalidSession();
    redirect("/login?error=session");
  }
  if (state.status === "active") {
    redirect(destinationForRole(state.profile.role));
  }

  return (
    <>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-danger">
        Acceso bloqueado
      </span>
      <h1 className="mt-1 mb-4 text-xl font-bold tracking-tight text-ink">
        Cuenta desactivada
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-ink-dim">
        Tu cuenta ({state.profile.name}) está desactivada y no puede utilizar
        Fichaje. Contacta con administración si crees que se trata de un
        error.
      </p>
      <form action={logout}>
        <Button type="submit" variant="ghost" className="w-full">
          Cerrar sesión
        </Button>
      </form>
    </>
  );
}
