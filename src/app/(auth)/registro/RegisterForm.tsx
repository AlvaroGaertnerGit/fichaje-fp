"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { COURSES, DEGREES, coursesForDegree } from "@/lib/academic";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/register";
import type { Degree } from "@/types";

import { register, type RegisterState } from "./actions";

const initialState: RegisterState = null;

// Confirm Email está desactivado en el proyecto: un registro con éxito deja
// sesión activa y redirige directamente a "/" (ver actions.ts). No hay
// ningún estado intermedio de "cuenta creada, revisa tu correo" que
// renderizar aquí — si `register()` no redirige, es que hubo un error.
export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, initialState);
  // Solo se necesita reaccionar al grado (para bloquear/desbloquear el
  // curso); el resto de campos siguen sin controlar, igual que antes.
  const [degree, setDegree] = useState<Degree | "">("");

  const describedBy = state?.error ? "register-error" : undefined;

  // Curso disponible según el grado: si ese grado solo oferta un curso
  // (hoy, ASIR), se bloquea automáticamente en ese único valor en vez de
  // dejar elegir entre opciones que no existen académicamente (§1 del
  // ajuste). Se deriva de src/lib/academic.ts (COURSES_BY_DEGREE) — la
  // misma fuente que usa la validación de servidor, así que no hay ninguna
  // regla "ASIR = solo 1º" duplicada aquí.
  const availableCourseValues = degree ? coursesForDegree(degree) : null;
  const lockedCourse =
    availableCourseValues?.length === 1
      ? COURSES.find((c) => c.value === availableCourseValues[0])
      : undefined;

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
      <PasswordField
        id="password"
        name="password"
        label="Contraseña"
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
        onChange={(e) => setDegree(e.target.value as Degree)}
        aria-describedby={describedBy}
      />

      {lockedCourse ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="course"
            className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint"
          >
            Curso
          </label>
          {/* Un solo curso disponible para este grado: el <select> se ve
              pero no se puede tocar (§1). Un <select disabled> no se envía
              con el formulario, así que el valor real viaja por el input
              oculto de al lado. */}
          <select
            id="course"
            disabled
            className="cursor-not-allowed border border-line-strong bg-paper-raised px-3.5 py-2.5 font-mono text-sm text-ink-faint"
          >
            <option value={lockedCourse.value}>{lockedCourse.label}</option>
          </select>
          <input type="hidden" name="course" value={lockedCourse.value} />
        </div>
      ) : (
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
      )}

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
