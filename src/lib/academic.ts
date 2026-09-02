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

/** "SMR 1º" — solo para mostrar; el dato se guarda siempre por separado. */
export function formatDegreeCourse(
  degree: Degree | null,
  course: Course | null,
): string | null {
  if (!degree || !course) return null;
  return `${degree} ${course}º`;
}
