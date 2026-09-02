import { describe, expect, it } from "vitest";

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/register";

import { generateTemporaryPassword, TEMPORARY_PASSWORD_LENGTH } from "./password";

// No se comprueba el contenido exacto de ninguna contraseña generada (eso
// la volvería predecible en los propios tests) — solo sus propiedades:
// longitud dentro de los límites de la app, charset permitido, e
// impredecibilidad estadística (no determinista, no colisiona en tandas
// razonables).

describe("generateTemporaryPassword", () => {
  it("longitud por defecto dentro de los límites de la app", () => {
    expect(TEMPORARY_PASSWORD_LENGTH).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
    expect(TEMPORARY_PASSWORD_LENGTH).toBeLessThanOrEqual(MAX_PASSWORD_LENGTH);
    expect(generateTemporaryPassword()).toHaveLength(TEMPORARY_PASSWORD_LENGTH);
  });

  it("acepta una longitud explícita dentro de los límites", () => {
    expect(generateTemporaryPassword(MIN_PASSWORD_LENGTH)).toHaveLength(MIN_PASSWORD_LENGTH);
    expect(generateTemporaryPassword(MAX_PASSWORD_LENGTH)).toHaveLength(MAX_PASSWORD_LENGTH);
  });

  it("rechaza una longitud por debajo del mínimo de la app", () => {
    expect(() => generateTemporaryPassword(MIN_PASSWORD_LENGTH - 1)).toThrow();
  });

  it("rechaza una longitud por encima del máximo de la app", () => {
    expect(() => generateTemporaryPassword(MAX_PASSWORD_LENGTH + 1)).toThrow();
  });

  it("usa únicamente el charset permitido (sin caracteres ambiguos 0/O/1/l/I)", () => {
    const password = generateTemporaryPassword(60);
    expect(password).toMatch(/^[A-HJ-NP-Za-km-z2-9!@#$%&*\-_+=]+$/);
    expect(password).not.toMatch(/[0O1lI]/);
  });

  it("es impredecible: 200 generaciones no se repiten y no son constantes", () => {
    const samples = Array.from({ length: 200 }, () => generateTemporaryPassword());
    expect(new Set(samples).size).toBe(samples.length);
  });

  it("no depende de Math.random ni de un reloj: dos llamadas en el mismo tick difieren", () => {
    const a = generateTemporaryPassword();
    const b = generateTemporaryPassword();
    expect(a).not.toBe(b);
  });
});
