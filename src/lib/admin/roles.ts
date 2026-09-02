import type { UserRole } from "@/types";

// Dominio cerrado de roles que Admin puede asignar (crear o cambiar a):
// nunca 'admin' (Fase 6.0 §3 — decisión aprobada, no se crean ni se
// asignan admins desde la UI, sin excepción). No es una validación de "si
// viene admin, rechazar": el tipo de entrada de cualquier formulario/acción
// de Admin no tiene ese valor posible, igual que buildStudentProfileInsert
// no acepta role como parámetro en el registro público.
export type AssignableRole = Extract<UserRole, "student" | "teacher">;

const ASSIGNABLE_ROLES: readonly AssignableRole[] = ["student", "teacher"];

export function isAssignableRole(value: string): value is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(value);
}

export const ASSIGNABLE_ROLE_OPTIONS: readonly {
  value: AssignableRole;
  label: string;
}[] = [
  { value: "student", label: "Alumno" },
  { value: "teacher", label: "Profesor" },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Alumno",
  teacher: "Profesor",
  admin: "Admin",
};

export function formatRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}
