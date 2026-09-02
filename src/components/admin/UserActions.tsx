"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  activateUser,
  deactivateUser,
  changeUserRole,
  type MutationResult,
} from "@/lib/admin/actions";
import {
  ASSIGNABLE_ROLE_OPTIONS,
  formatRoleLabel,
  type AssignableRole,
} from "@/lib/admin/roles";
import type { Profile } from "@/types";

// Guardas reales: SQL (admin_change_role / admin_set_active, ver
// migración 20260902200500). Lo de aquí es solo UX — ocultar/etiquetar
// controles que la BD rechazaría igualmente — nunca la barrera (Fase 6.1
// §14/§15).
//
// Fase 6.1.1: cambiar rol y desactivar son igual de sensibles, así que
// ahora comparten el mismo patrón de confirmación en dos pasos (antes solo
// lo tenía desactivar) — y las tres mutaciones dejan un mensaje de éxito
// explícito, no solo el cambio silencioso de otra parte de la pantalla.
export function UserActions({
  target,
  isSelf,
}: {
  target: Profile;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [confirmingRole, setConfirmingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AssignableRole | "">("");

  if (isSelf) {
    return (
      <p className="max-w-md border border-line-strong bg-paper-raised px-4 py-3 text-sm text-ink-dim">
        Estás viendo tu propia cuenta: no puedes cambiar tu rol ni
        desactivarte a ti mismo.
      </p>
    );
  }

  function runMutation(fn: () => Promise<MutationResult>, successText: string) {
    setError(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        setError(result.error);
      } else {
        setSuccessMessage(successText);
        setConfirmingDeactivate(false);
        setConfirmingRole(false);
        setSelectedRole("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
          Cambiar rol
        </div>
        <div className="mt-2">
          {confirmingRole && selectedRole ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-ink-dim">
                ¿Cambiar el rol de {target.name} de{" "}
                <span className="font-semibold text-ink">
                  {formatRoleLabel(target.role)}
                </span>{" "}
                a{" "}
                <span className="font-semibold text-ink">
                  {formatRoleLabel(selectedRole)}
                </span>
                ?
              </span>
              <Button
                type="button"
                disabled={pending}
                onClick={() =>
                  runMutation(
                    () => changeUserRole(target.id, selectedRole),
                    `Rol actualizado a ${formatRoleLabel(selectedRole)}.`,
                  )
                }
              >
                {pending ? "Aplicando…" : "Confirmar cambio"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setConfirmingRole(false)}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="new-role">
                Nuevo rol
              </label>
              <select
                id="new-role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as AssignableRole)}
                disabled={pending}
                className="border border-line-strong bg-paper-raised px-3.5 py-2.5 font-mono text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-stamp"
              >
                <option value="" disabled>
                  Seleccionar rol
                </option>
                {/* 'admin' nunca es una opción aquí — no hay forma de crear
                    ni asignar ese rol desde este control (Fase 6.0 §3). El
                    rol actual del usuario tampoco se ofrece como destino. */}
                {ASSIGNABLE_ROLE_OPTIONS.filter((o) => o.value !== target.role).map(
                  (option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ),
                )}
              </select>
              <Button
                type="button"
                variant="ghost"
                disabled={pending || !selectedRole}
                onClick={() => setConfirmingRole(true)}
              >
                Cambiar
              </Button>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
          Estado
        </div>
        <div className="mt-2">
          {target.active ? (
            confirmingDeactivate ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-ink-dim">
                  ¿Seguro que quieres desactivar a {target.name}?
                </span>
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    runMutation(
                      () => deactivateUser(target.id),
                      `${target.name} desactivado.`,
                    )
                  }
                >
                  {pending ? "Desactivando…" : "Confirmar desactivación"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setConfirmingDeactivate(false)}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setConfirmingDeactivate(true)}>
                Desactivar usuario
              </Button>
            )
          ) : (
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                runMutation(
                  () => activateUser(target.id),
                  `${target.name} reactivado.`,
                )
              }
            >
              {pending ? "Activando…" : "Reactivar usuario"}
            </Button>
          )}
        </div>
      </div>

      {successMessage && (
        <p role="status" className="inline-flex items-center gap-1.5 text-sm text-ink">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-stamp" />
          {successMessage}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
