import { describe, expect, it } from "vitest";

import {
  buildStudentProfileInsert,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validateRegistrationInput,
  type RegistrationInput,
} from "./register";

function validInput(
  overrides: Partial<RegistrationInput> = {},
): RegistrationInput {
  return {
    firstName: "Ana",
    lastName: "García López",
    email: "ana@alumnos.fp.test",
    password: "Contraseña123",
    degree: "SMR",
    course: "1",
    ...overrides,
  };
}

describe("validateRegistrationInput", () => {
  it("formulario válido -> devuelve name/email/degree/course, sin error", () => {
    const result = validateRegistrationInput(validInput());
    expect(result).toEqual({
      name: "Ana García López",
      email: "ana@alumnos.fp.test",
      degree: "SMR",
      course: "1",
    });
  });

  it("normaliza el email a minúsculas y sin espacios", () => {
    const result = validateRegistrationInput(
      validInput({ email: "  Ana@Alumnos.FP.test  " }),
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.email).toBe("ana@alumnos.fp.test");
    }
  });

  it("nombre obligatorio", () => {
    expect(validateRegistrationInput(validInput({ firstName: "  " }))).toEqual({
      error: "Completa tu nombre y apellidos.",
    });
  });

  it("apellidos obligatorios", () => {
    expect(validateRegistrationInput(validInput({ lastName: "" }))).toEqual({
      error: "Completa tu nombre y apellidos.",
    });
  });

  it("email obligatorio", () => {
    expect(validateRegistrationInput(validInput({ email: "" }))).toEqual({
      error: "Introduce un correo electrónico válido.",
    });
  });

  it("email con formato inválido", () => {
    expect(
      validateRegistrationInput(validInput({ email: "no-es-un-email" })),
    ).toEqual({
      error: "Introduce un correo electrónico válido.",
    });
  });

  it("contraseña obligatoria", () => {
    expect(validateRegistrationInput(validInput({ password: "" }))).toEqual({
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    });
  });

  it("contraseña demasiado corta (mínimo de la app - 1) -> rechazada", () => {
    const tooShort = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    expect(
      validateRegistrationInput(validInput({ password: tooShort })),
    ).toEqual({
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    });
  });

  it("contraseña exactamente en el mínimo de la app -> aceptada", () => {
    // El mínimo real de Supabase Auth para este proyecto es 6 (comprobado
    // en vivo); el de la app es 8, deliberadamente más estricto, así que
    // cualquier contraseña que la app acepte, Supabase también la acepta.
    const atMin = "a".repeat(MIN_PASSWORD_LENGTH);
    const result = validateRegistrationInput(validInput({ password: atMin }));
    expect("error" in result).toBe(false);
  });

  it("contraseña exactamente en el máximo (72, límite real de Supabase/bcrypt) -> aceptada", () => {
    const atMax = "a".repeat(MAX_PASSWORD_LENGTH);
    const result = validateRegistrationInput(validInput({ password: atMax }));
    expect("error" in result).toBe(false);
  });

  it("contraseña por encima del máximo (72 + 1) -> rechazada antes de llegar a Supabase", () => {
    const overMax = "a".repeat(MAX_PASSWORD_LENGTH + 1);
    expect(
      validateRegistrationInput(validInput({ password: overMax })),
    ).toEqual({
      error: `La contraseña no puede tener más de ${MAX_PASSWORD_LENGTH} caracteres.`,
    });
  });

  it("grado obligatorio y válido", () => {
    expect(validateRegistrationInput(validInput({ degree: "" }))).toEqual({
      error: "Selecciona un grado válido.",
    });
    expect(validateRegistrationInput(validInput({ degree: "DAM" }))).toEqual({
      error: "Selecciona un grado válido.",
    });
  });

  it("curso obligatorio y válido", () => {
    expect(validateRegistrationInput(validInput({ course: "" }))).toEqual({
      error: "Selecciona un curso válido.",
    });
    expect(validateRegistrationInput(validInput({ course: "3" }))).toEqual({
      error: "Selecciona un curso válido.",
    });
  });
});

describe("buildStudentProfileInsert", () => {
  const validated = {
    name: "Ana García López",
    email: "ana@alumnos.fp.test",
    degree: "SMR" as const,
    course: "1" as const,
  };

  it("role siempre 'student' y active siempre true", () => {
    const insert = buildStudentProfileInsert("user-123", validated);
    expect(insert.role).toBe("student");
    expect(insert.active).toBe(true);
    expect(insert.id).toBe("user-123");
    expect(insert.name).toBe(validated.name);
    expect(insert.email).toBe(validated.email);
    expect(insert.degree).toBe("SMR");
    expect(insert.course).toBe("1");
  });

  it("no existe forma de que un payload manipulado cambie role/active: la función ni siquiera acepta esos campos", () => {
    // Simula el intento de un atacante: aunque el objeto (con un cast
    // forzado, como haría un `any` en un payload deserializado a mano)
    // llevara role/active/id propios, buildStudentProfileInsert los
    // ignora por completo porque su firma no los recibe como entrada —
    // el único `id` real es el argumento explícito `userId`.
    const maliciousValidated = {
      ...validated,
      role: "admin",
      active: false,
    } as typeof validated;

    const insert = buildStudentProfileInsert(
      "real-auth-user-id",
      maliciousValidated,
    );

    expect(insert.role).toBe("student");
    expect(insert.active).toBe(true);
    expect(insert.id).toBe("real-auth-user-id");
  });

  it("nunca puede producir role 'teacher'", () => {
    const insert = buildStudentProfileInsert("user-456", {
      ...validated,
      // @ts-expect-error intento de inyectar un role distinto
      role: "teacher",
    });
    expect(insert.role).toBe("student");
  });
});
