import {
  isCourseAllowedForDegree,
  isValidCourse,
  isValidDegree,
} from "@/lib/academic";
import type { Course, Degree } from "@/types";

// Lógica pura, sin Supabase ni Next.js: valida el formulario y construye la
// fila a insertar en `profiles`. Separarla de la Server Action permite
// testear la propiedad de seguridad más importante de este flujo (role
// SIEMPRE 'student', active SIEMPRE true) sin mockear cookies/Supabase.

export type RegistrationInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  degree: string;
  course: string;
};

export type ValidatedRegistration = {
  name: string;
  email: string;
  degree: Degree;
  course: Course;
};

// El mínimo real configurado en Supabase Auth para este proyecto es 6
// (comprobado en vivo: signUp con 5 caracteres -> weak_password, con 6 ->
// pasa esa validación). 8 es una elección deliberadamente más estricta de
// la aplicación (contraseña mínimamente razonable), nunca al revés: nunca
// aceptamos algo que Supabase fuera a rechazar por corto.
export const MIN_PASSWORD_LENGTH = 8;
// 72 es un límite real y no configurable de Supabase Auth (GoTrue usa
// bcrypt, que trunca/rechaza por encima de 72 bytes): comprobado en vivo,
// signUp con 73 caracteres -> "Password cannot be longer than 72
// characters" pase lo que pase. Sin este límite en la aplicación, un
// alumno podría escribir una contraseña que el formulario y el servidor
// aceptan pero Supabase rechaza.
export const MAX_PASSWORD_LENGTH = 72;
// Simple a propósito: comprobación de forma (usuario@dominio.tld), no de
// entregabilidad — eso ya lo valida Supabase Auth al crear el usuario real.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistrationInput(
  input: RegistrationInput,
): ValidatedRegistration | { error: string } {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();

  if (!firstName || !lastName) {
    return { error: "Completa tu nombre y apellidos." };
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { error: "Introduce un correo electrónico válido." };
  }
  if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }
  if (input.password.length > MAX_PASSWORD_LENGTH) {
    return {
      error: `La contraseña no puede tener más de ${MAX_PASSWORD_LENGTH} caracteres.`,
    };
  }
  if (!isValidDegree(input.degree)) {
    return { error: "Selecciona un grado válido." };
  }
  if (!isValidCourse(input.course)) {
    return { error: "Selecciona un curso válido." };
  }
  // Grado y curso individualmente válidos no bastan: ASIR + 2º no existe
  // como oferta académica, aunque "ASIR" y "2" sean, cada uno por separado,
  // valores permitidos. Sin este chequeo, un FormData manipulado a mano
  // (degree=ASIR, course=2) pasaría las dos comprobaciones anteriores.
  if (!isCourseAllowedForDegree(input.degree, input.course)) {
    return {
      error: "Ese curso no está disponible para el grado seleccionado.",
    };
  }

  return {
    name: `${firstName} ${lastName}`,
    email,
    degree: input.degree,
    course: input.course,
  };
}

export type NewStudentProfileInsert = {
  id: string;
  name: string;
  email: string;
  role: "student";
  active: true;
  degree: Degree;
  course: Course;
};

/**
 * Fila a insertar en `profiles` para un alta pública. `role` y `active`
 * están fijados en la firma de tipos (literales `"student"`/`true`) y en la
 * implementación: no existe ningún parámetro por el que un formulario
 * manipulado ("role": "admin" en el payload) pueda cambiar ese resultado —
 * esta función ni siquiera acepta un campo `role` de entrada.
 */
export function buildStudentProfileInsert(
  userId: string,
  validated: ValidatedRegistration,
): NewStudentProfileInsert {
  return {
    id: userId,
    name: validated.name,
    email: validated.email,
    role: "student",
    active: true,
    degree: validated.degree,
    course: validated.course,
  };
}
