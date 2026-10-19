import {
  EMAIL_PATTERN,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/register";

// Lógica pura de la recuperación de contraseña (sin Supabase ni Next.js),
// compartida por las Server Actions, el callback y proxy.ts. Sin
// "server-only": proxy.ts necesita el nombre de la cookie.

/**
 * Marca de "sesión de recuperación". Tras verificar el enlace del correo,
 * Supabase deja una sesión normal; sin esta marca no habría forma de
 * distinguirla de un login con contraseña. Se fija en /auth/confirm
 * (httpOnly, valor = id del usuario verificado) y mientras exista proxy.ts
 * confina esa sesión a /restablecer-contrasena. No contiene ningún token:
 * solo dice "esta sesión viene de un enlace de recuperación".
 */
export const RECOVERY_COOKIE = "fichaje_pw_recovery";
export const RECOVERY_COOKIE_MAX_AGE_SECONDS = 15 * 60;

export const RESET_PASSWORD_PATH = "/restablecer-contrasena";
export const AUTH_CONFIRM_PATH = "/auth/confirm";

// URL pública de la aplicación para el enlace del correo. Nunca se deriva
// de la cabecera Host de la petición (manipulable): el enlace del email
// siempre apunta al despliegue real. `SITE_URL` permite sobrescribirla
// (p.ej. en un preview) sin tocar código.
const DEFAULT_SITE_URL = "https://fichaje-fp.vercel.app";

export function recoveryRedirectUrl(siteUrl = process.env.SITE_URL): string {
  const base = (siteUrl?.trim() || DEFAULT_SITE_URL).replace(/\/+$/, "");
  return `${base}${AUTH_CONFIRM_PATH}`;
}

export function validateRecoveryEmail(
  raw: string,
): { email: string } | { error: string } {
  const email = raw.trim().toLowerCase();
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { error: "Introduce un correo electrónico válido." };
  }
  return { email };
}

export function validateNewPassword(
  password: string,
  confirmation: string,
): { error: string } | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      error: `La contraseña no puede tener más de ${MAX_PASSWORD_LENGTH} caracteres.`,
    };
  }
  if (password !== confirmation) {
    return { error: "Las contraseñas no coinciden." };
  }
  return null;
}
