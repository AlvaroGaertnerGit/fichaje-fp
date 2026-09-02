"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import { TextField } from "@/components/ui/text-field";
import { login, type LoginState } from "./actions";

const initialState: LoginState = null;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <TextField
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        disabled={pending}
        aria-describedby={state?.error ? "login-error" : undefined}
      />
      <PasswordField
        id="password"
        name="password"
        label="Contraseña"
        autoComplete="current-password"
        required
        disabled={pending}
        aria-describedby={state?.error ? "login-error" : undefined}
      />

      {state?.error && (
        <p id="login-error" role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Validando…" : "Entrar"}
      </Button>
    </form>
  );
}
