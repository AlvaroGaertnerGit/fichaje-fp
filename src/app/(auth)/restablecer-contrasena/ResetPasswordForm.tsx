"use client";

import { useActionState, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import { validateNewPassword } from "@/lib/auth/password-reset";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/register";

import { resetPassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = null;

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);
  const [clientError, setClientError] = useState<string | null>(null);

  // Misma validación que el servidor (validateNewPassword), adelantada
  // para no hacer un viaje de ida y vuelta por un error evidente. El
  // servidor la repite siempre: esto es solo UX.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const invalid = validateNewPassword(
      String(data.get("password") ?? ""),
      String(data.get("confirmPassword") ?? ""),
    );
    setClientError(invalid?.error ?? null);
    if (invalid) event.preventDefault();
  }

  const error = clientError ?? state?.error ?? null;
  const describedBy = error ? "reset-error" : undefined;

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="flex flex-col gap-5"
      noValidate
    >
      <PasswordField
        id="password"
        name="password"
        label="Nueva contraseña"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={MAX_PASSWORD_LENGTH}
        required
        disabled={pending}
        aria-describedby={describedBy}
      />
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label="Repite la contraseña"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={MAX_PASSWORD_LENGTH}
        required
        disabled={pending}
        aria-describedby={describedBy}
      />

      <p className="-mt-2 text-xs text-ink-faint">
        Entre {MIN_PASSWORD_LENGTH} y {MAX_PASSWORD_LENGTH} caracteres.
      </p>

      {error && (
        <p id="reset-error" role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
