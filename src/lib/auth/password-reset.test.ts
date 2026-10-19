import { describe, expect, it } from "vitest";

import {
  recoveryRedirectUrl,
  validateNewPassword,
  validateRecoveryEmail,
} from "./password-reset";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./register";

describe("recoveryRedirectUrl", () => {
  it("usa el despliegue público por defecto, nunca localhost", () => {
    expect(recoveryRedirectUrl(undefined)).toBe(
      "https://fichaje-fp.vercel.app/auth/confirm",
    );
    expect(recoveryRedirectUrl("")).toBe(
      "https://fichaje-fp.vercel.app/auth/confirm",
    );
  });

  it("respeta SITE_URL y elimina la barra final", () => {
    expect(recoveryRedirectUrl("https://preview.example.com/")).toBe(
      "https://preview.example.com/auth/confirm",
    );
  });
});

describe("validateRecoveryEmail", () => {
  it("normaliza un email válido", () => {
    expect(validateRecoveryEmail("  Ana@FP.test ")).toEqual({
      email: "ana@fp.test",
    });
  });

  it("rechaza formatos inválidos", () => {
    expect(validateRecoveryEmail("")).toHaveProperty("error");
    expect(validateRecoveryEmail("ana@")).toHaveProperty("error");
    expect(validateRecoveryEmail("ana fp.test")).toHaveProperty("error");
  });
});

describe("validateNewPassword", () => {
  const ok = "a".repeat(MIN_PASSWORD_LENGTH);

  it("acepta una contraseña válida confirmada", () => {
    expect(validateNewPassword(ok, ok)).toBeNull();
    const max = "b".repeat(MAX_PASSWORD_LENGTH);
    expect(validateNewPassword(max, max)).toBeNull();
  });

  it("rechaza contraseñas demasiado cortas o largas", () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    const long = "a".repeat(MAX_PASSWORD_LENGTH + 1);
    expect(validateNewPassword(short, short)).toHaveProperty("error");
    expect(validateNewPassword(long, long)).toHaveProperty("error");
  });

  it("rechaza confirmación distinta", () => {
    expect(validateNewPassword(ok, `${ok}x`)).toEqual({
      error: "Las contraseñas no coinciden.",
    });
  });
});
