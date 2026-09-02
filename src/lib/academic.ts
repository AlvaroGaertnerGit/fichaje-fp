import type { Course, Degree } from "@/types";

// Fuente única de verdad para los valores permitidos de grado/curso:
// usada tanto por el <select> de /registro como por la validación de
// servidor, para que nunca puedan desincronizarse.
export const DEGREES: readonly { value: Degree; label: string }[] = [
  { value: "SMR", label: "SMR — Sistemas Microinformáticos y Redes" },
  {
    value: "ASIR",
    label: "ASIR — Administración de Sistemas Informáticos en Red",
  },
];

export const COURSES: readonly { value: Course; label: string }[] = [
  { value: "1", label: "1º" },
  { value: "2", label: "2º" },
];

const DEGREE_VALUES: readonly Degree[] = DEGREES.map((d) => d.value);
const COURSE_VALUES: readonly Course[] = COURSES.map((c) => c.value);

export function isValidDegree(value: string): value is Degree {
  return (DEGREE_VALUES as readonly string[]).includes(value);
}

export function isValidCourse(value: string): value is Course {
  return (COURSE_VALUES as readonly string[]).includes(value);
}

// Oferta académica real: SMR tiene 1º y 2º, ASIR solo tiene 1º (no existe
// un 2º de ASIR en el centro). Única fuente de verdad para el <select>
// dependiente de /registro y para la validación de servidor — nunca
// pueden desincronizarse porque ambos leen de aquí.
export const COURSES_BY_DEGREE: Readonly<Record<Degree, readonly Course[]>> = {
  SMR: ["1", "2"],
  ASIR: ["1"],
};

/** Cursos ofertados para un grado (para construir el <select> dependiente). */
export function coursesForDegree(degree: Degree): readonly Course[] {
  return COURSES_BY_DEGREE[degree];
}

/** ¿Existe esa combinación grado+curso? (p.ej. ASIR + 2º no está en la oferta). */
export function isCourseAllowedForDegree(
  degree: Degree,
  course: Course,
): boolean {
  return COURSES_BY_DEGREE[degree].includes(course);
}

/** "SMR 1º" — solo para mostrar; el dato se guarda siempre por separado. */
export function formatDegreeCourse(
  degree: Degree | null,
  course: Course | null,
): string | null {
  if (!degree || !course) return null;
  return `${degree} ${course}º`;
}
