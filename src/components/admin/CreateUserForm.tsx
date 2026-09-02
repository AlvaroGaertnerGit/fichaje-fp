"use client";

import { useActionState, useState } from "react";

import { TemporaryPasswordReveal } from "@/components/admin/TemporaryPasswordReveal";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { COURSES, DEGREES, coursesForDegree } from "@/lib/academic";
import { createStaffOrStudentUser, type CreateUserState } from "@/lib/admin/actions";
import { ASSIGNABLE_ROLE_OPTIONS, type AssignableRole } from "@/lib/admin/roles";
import type { Degree } from "@/types";

const initialState: CreateUserState = null;

// `formKey` fuerza un remount completo (useActionState fresco) al pulsar
// "Crear otro usuario" en el panel de éxito — no hay forma de resetear el
// estado de useActionState de otro modo, y una navegación de cliente a la
// misma ruta no remonta el componente por sí sola.
export function CreateUserForm() {
  const [formKey, setFormKey] = useState(0);
  return <CreateUserFormInner key={formKey} onCreateAnother={() => setFormKey((k) => k + 1)} />;
}

function CreateUserFormInner({ onCreateAnother }: { onCreateAnother: () => void }) {
  const [state, formAction, pending] = useActionState(createStaffOrStudentUser, initialState);
  const [role, setRole] = useState<AssignableRole | "">("");
  const [degree, setDegree] = useState<Degree | "">("");

  if (state?.success) {
    return (
      <TemporaryPasswordReveal
        user={state.user}
        temporaryPassword={state.temporaryPassword}
        onCreateAnother={onCreateAnother}
      />
    );
  }

  const describedBy = state?.error ? "create-user-error" : undefined;

  // Mismo patrón que RegisterForm: si el grado elegido solo oferta un
  // curso (ASIR), el curso se bloquea automáticamente en ese único valor.
  const availableCourseValues = degree ? coursesForDegree(degree) : null;
  const lockedCourse =
    availableCourseValues?.length === 1
      ? COURSES.find((c) => c.value === availableCourseValues[0])
      : undefined;

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5" noValidate>
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

      {/* Rol restringido estructuralmente a student|teacher — 'admin' no
          es una opción en esta lista, no algo que se valide y rechace
          (Fase 6.0 §3, Fase 6.1 §7). */}
      <SelectField
        id="role"
        name="role"
        label="Rol"
        placeholder="Seleccionar rol"
        options={ASSIGNABLE_ROLE_OPTIONS}
        required
        disabled={pending}
        onChange={(e) => setRole(e.target.value as AssignableRole)}
        aria-describedby={describedBy}
      />

      {role === "student" && (
        <>
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
        </>
      )}

      {state?.error && (
        <p id="create-user-error" role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Creando…" : "Crear usuario"}
      </Button>
    </form>
  );
}
