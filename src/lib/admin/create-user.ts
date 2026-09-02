import {
  isCourseAllowedForDegree,
  isValidCourse,
  isValidDegree,
} from "@/lib/academic";
import type { Course, Degree } from "@/types";

import { isAssignableRole, type AssignableRole } from "./roles";

// Lógica pura, sin Supabase ni Next.js — mismo motivo que
// src/lib/auth/register.ts: se puede testear la propiedad de seguridad más
// importante (role SIEMPRE student|teacher, nunca admin) sin mockear nada.
// Separado del registro público a propósito (Fase 6.0 §15): son dos flujos
// con dueños y garantías distintas, no deben poder desincronizarse por un
// cambio pensado solo para uno de los dos.

export type NewUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  degree: string;
  course: string;
};

export type ValidatedNewUser = {
  name: string;
  email: string;
  role: AssignableRole;
  degree: Degree | null;
  course: Course | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida el alta de un usuario por Admin. `role` está restringido en
 * tiempo de ejecución a `isAssignableRole` (student|teacher, nunca admin) —
 * aunque un payload manipulado enviara `role=admin`, esta función lo
 * rechaza aquí, antes de que llegue a ningún cliente de Supabase.
 * degree/course solo se piden (y se validan la combinación real, p.ej.
 * ASIR solo tiene 1º) cuando el rol es student: un profesor no tiene grado
 * ni curso académico.
 */
export function validateNewUserInput(
  input: NewUserInput,
): ValidatedNewUser | { error: string } {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();

  if (!firstName || !lastName) {
    return { error: "Completa el nombre y los apellidos." };
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { error: "Introduce un correo electrónico válido." };
  }
  if (!isAssignableRole(input.role)) {
    return { error: "Selecciona un rol válido." };
  }

  const name = `${firstName} ${lastName}`;

  if (input.role === "teacher") {
    return { name, email, role: "teacher", degree: null, course: null };
  }

  if (!isValidDegree(input.degree)) {
    return { error: "Selecciona un grado válido." };
  }
  if (!isValidCourse(input.course)) {
    return { error: "Selecciona un curso válido." };
  }
  if (!isCourseAllowedForDegree(input.degree, input.course)) {
    return { error: "Ese curso no está disponible para el grado seleccionado." };
  }

  return {
    name,
    email,
    role: "student",
    degree: input.degree,
    course: input.course,
  };
}
