"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import {
  requestPasswordRecovery,
  type RequestRecoveryState,
} from "./actions";

const initialState: RequestRecoveryState = null;

export function RecoveryRequestForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordRecovery,
    initialState,
  );

  if (state && "sent" in state) {
    return (
      <p role="status" className="border border-stamp bg-stamp-soft px-4 py-3 text-sm leading-relaxed text-stamp-ink">
        Si existe una cuenta asociada a ese correo, recibirás en unos minutos
        un enlace para restablecer la contraseña. Revisa también la carpeta de
        spam.
      </p>
    );
  }

  const error = state && "error" in state ? state.error : null;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <TextField
        id="email"
        name="email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        required
        disabled={pending}
        aria-describedby={error ? "recovery-error" : undefined}
      />

      {error && (
        <p id="recovery-error" role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Enviando…" : "Enviar enlace"}
      </Button>
    </form>
  );
}
