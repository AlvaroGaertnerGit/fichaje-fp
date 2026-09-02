import { describe, expect, it } from "vitest";

import { validateNewUserInput, type NewUserInput } from "./create-user";

function validInput(overrides: Partial<NewUserInput> = {}): NewUserInput {
  return {
    firstName: "Marta",
    lastName: "Ruiz Soler",
    email: "marta.ruiz@gsd.coop",
    role: "student",
    degree: "SMR",
    course: "1",
    ...overrides,
  };
}

describe("validateNewUserInput", () => {
  it("alumno válido -> role student, degree/course presentes", () => {
    const result = validateNewUserInput(validInput());
    expect(result).toEqual({
      name: "Marta Ruiz Soler",
      email: "marta.ruiz@gsd.coop",
      role: "student",
      degree: "SMR",
      course: "1",
    });
  });

  it("profesor válido -> role teacher, degree/course null (sin grado académico)", () => {
    const result = validateNewUserInput(
      validInput({ role: "teacher", degree: "", course: "" }),
    );
    expect(result).toEqual({
      name: "Marta Ruiz Soler",
      email: "marta.ruiz@gsd.coop",
      role: "teacher",
      degree: null,
      course: null,
    });
  });

  it("nunca acepta role='admin': ni siquiera llega a la validación de degree/course", () => {
    expect(validateNewUserInput(validInput({ role: "admin" }))).toEqual({
      error: "Selecciona un rol válido.",
    });
  });

  it("rechaza cualquier valor de rol fuera de student|teacher (payload manipulado)", () => {
    expect(validateNewUserInput(validInput({ role: "superadmin" }))).toEqual({
      error: "Selecciona un rol válido.",
    });
    expect(validateNewUserInput(validInput({ role: "" }))).toEqual({
      error: "Selecciona un rol válido.",
    });
  });

  it("nombre y apellidos obligatorios", () => {
    expect(validateNewUserInput(validInput({ firstName: "  " }))).toEqual({
      error: "Completa el nombre y los apellidos.",
    });
    expect(validateNewUserInput(validInput({ lastName: "" }))).toEqual({
      error: "Completa el nombre y los apellidos.",
    });
  });

  it("email obligatorio y con formato válido", () => {
    expect(validateNewUserInput(validInput({ email: "" }))).toEqual({
      error: "Introduce un correo electrónico válido.",
    });
    expect(validateNewUserInput(validInput({ email: "no-es-un-email" }))).toEqual({
      error: "Introduce un correo electrónico válido.",
    });
  });

  it("normaliza el email a minúsculas y sin espacios", () => {
    const result = validateNewUserInput(
      validInput({ email: "  Marta.Ruiz@GSD.coop  " }),
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.email).toBe("marta.ruiz@gsd.coop");
    }
  });

  // Mismos casos que register.test.ts para la combinación degree/course —
  // misma fuente de verdad (src/lib/academic.ts), no debe desincronizarse.
  it("ASIR + curso 1 -> aceptado", () => {
    const result = validateNewUserInput(validInput({ degree: "ASIR", course: "1" }));
    expect("error" in result).toBe(false);
  });

  it("ASIR + curso 2 -> rechazado (no existe esa oferta académica)", () => {
    expect(validateNewUserInput(validInput({ degree: "ASIR", course: "2" }))).toEqual({
      error: "Ese curso no está disponible para el grado seleccionado.",
    });
  });

  it("SMR + curso 1 -> aceptado", () => {
    const result = validateNewUserInput(validInput({ degree: "SMR", course: "1" }));
    expect("error" in result).toBe(false);
  });

  it("SMR + curso 2 -> aceptado", () => {
    const result = validateNewUserInput(validInput({ degree: "SMR", course: "2" }));
    expect("error" in result).toBe(false);
  });

  it("grado obligatorio y válido cuando el rol es student", () => {
    expect(validateNewUserInput(validInput({ degree: "" }))).toEqual({
      error: "Selecciona un grado válido.",
    });
    expect(validateNewUserInput(validInput({ degree: "DAM" }))).toEqual({
      error: "Selecciona un grado válido.",
    });
  });

  it("curso obligatorio y válido cuando el rol es student", () => {
    expect(validateNewUserInput(validInput({ course: "" }))).toEqual({
      error: "Selecciona un curso válido.",
    });
    expect(validateNewUserInput(validInput({ course: "3" }))).toEqual({
      error: "Selecciona un curso válido.",
    });
  });

  it("profesor: no valida grado/curso aunque vengan vacíos o inválidos en el payload", () => {
    const result = validateNewUserInput(
      validInput({ role: "teacher", degree: "DAM", course: "9" }),
    );
    // El rol teacher ignora degree/course por completo, ni siquiera los lee.
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.degree).toBeNull();
      expect(result.course).toBeNull();
    }
  });
});
