import "server-only";

import { randomInt } from "node:crypto";

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/register";

// Contraseña temporal para altas/reseteos administrativos (Fase 6.1 §9).
// `randomInt` de node:crypto usa el generador criptográficamente seguro del
// sistema operativo (no Math.random, ni un timestamp, ni ningún valor
// predecible) — cada carácter se elige de forma independiente y uniforme
// dentro del charset.
//
// Charset sin caracteres visualmente ambiguos (0/O, 1/l/I) para que un
// admin pueda transcribirla a mano sin errores, con mayúsculas, minúsculas,
// dígitos y símbolos para no depender solo de la longitud.
const CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*-_+=";

// Por debajo del máximo real (72, límite de bcrypt) y bastante por encima
// del mínimo de la app (8): una temporal generada por servidor puede
// permitirse ser larga, nadie tiene que recordarla ni teclearla dos veces.
export const TEMPORARY_PASSWORD_LENGTH = 20;

/**
 * Genera una contraseña temporal aleatoria e impredecible. Nunca se
 * almacena, nunca se loguea, nunca se guarda en `audit_logs` ni en ningún
 * `metadata` — se devuelve una única vez a quien la generó (ver
 * src/lib/admin/actions.ts) para que la muestre al Admin.
 */
export function generateTemporaryPassword(
  length: number = TEMPORARY_PASSWORD_LENGTH,
): string {
  if (length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `generateTemporaryPassword: longitud fuera de rango [${MIN_PASSWORD_LENGTH}, ${MAX_PASSWORD_LENGTH}]`,
    );
  }

  let password = "";
  for (let i = 0; i < length; i++) {
    password += CHARSET[randomInt(CHARSET.length)];
  }
  return password;
}
