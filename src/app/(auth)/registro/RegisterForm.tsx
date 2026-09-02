"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { COURSES, DEGREES } from "@/lib/academic";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/register";

import { register, type RegisterState } from "./actions";

const initialState: RegisterState = null;

// Confirm Email está desactivado en el proyecto: un registro con éxito deja
// sesión activa y redirige directamente a "/" (ver actions.ts). No hay
// ningún estado intermedio de "cuenta creada, revisa tu correo" que
// renderizar aquí — si `register()` no redirige, es que hubo un error.
export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, initialState);

  const describedBy = state?.error ? "register-error" : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <TextField
        id="firstName"
        name="firstName"
        label="Nombre"
        autoComplete="given-name"
        required
        disabled={pending}
        aria-describedby={describedBy}
      />
      <TextField
        id="lastName"
        name="lastName"
        label="Apellidos"
        autoComplete="family-name"
        required
        disabled={pending}
        aria-describedby={describedBy}
      />
      <TextField
        id="email"
        name="email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        required
        disabled={pending}
        aria-describedby={describedBy}
      />
      <TextField
        id="password"
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={MAX_PASSWORD_LENGTH}
        required
        disabled={pending}
        aria-describedby={describedBy}
      />
      <SelectField
        id="degree"
        name="degree"
        label="Grado"
        placeholder="Seleccionar grado"
        options={DEGREES}
        required
        disabled={pending}
        aria-describedby={describedBy}
      />
      <SelectField
        id="course"
        name="course"
        label="Curso"
        placeholder="Seleccionar curso"
        options={COURSES}
        required
        disabled={pending}
        aria-describedby={describedBy}
      />

      {state?.error && (
        <p id="register-error" role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Creando…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
