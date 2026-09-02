"use server";

import { redirect } from "next/navigation";

import { destinationForRole } from "@/lib/auth/session";
import {
  buildStudentProfileInsert,
  validateRegistrationInput,
} from "@/lib/auth/register";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RegisterState = { error: string } | null;

const GENERIC_ERROR = "No se ha podido crear la cuenta. Inténtalo de nuevo.";
const EMAIL_IN_USE = "Ya existe una cuenta con este correo. Inicia sesión.";

/**
 * Alta pública de alumno. `role`/`active` nunca se leen de `formData`: los
 * fija `buildStudentProfileInsert` (ver ese archivo). Aunque una petición
 * manipulada incluyera `{ "role": "admin" }`, el código no tiene ninguna
 * ruta que lea esa clave — es estructuralmente imposible que cambie el
 * resultado, no solo "no debería pasar".
 */
export async function register(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const validated = validateRegistrationInput({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    degree: String(formData.get("degree") ?? ""),
    course: String(formData.get("course") ?? ""),
  });

  if ("error" in validated) {
    return { error: validated.error };
  }

  const password = String(formData.get("password") ?? "");

  // 1: crear el usuario real en Supabase Auth (publishable key — nunca la
  // secreta para esto). Confirm Email está desactivado en este proyecto
  // (Authentication → Settings, comprobado en el dashboard): un signUp con
  // éxito deja sesión activa de inmediato, no hace falta ningún paso de
  // "revisa tu correo".
  const supabase = await createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: validated.email,
    password,
  });

  if (signUpError) {
    return { error: mapSignUpError(signUpError) };
  }

  const user = signUpData.user;
  if (!user) {
    console.error("[auth] signUp sin user en la respuesta");
    return { error: GENERIC_ERROR };
  }

  // Defensa general (no específica de confirmación de email): en algunas
  // configuraciones de Supabase, un signUp para un email que ya existe
  // "tiene éxito" (sin error) pero no crea una identidad nueva
  // (`identities: []`), en vez de devolver un error `user_already_exists`
  // directo. Sin este chequeo parecería una cuenta nueva que en realidad
  // ya existe.
  if (user.identities && user.identities.length === 0) {
    return { error: EMAIL_IN_USE };
  }

  // 2: crear el profile. Server-only, Secret Key (bypassa RLS a propósito:
  // este es exactamente el flujo que la arquitectura ya reserva para
  // servidor, ver src/lib/supabase/admin.ts). `role`/`active` fijos.
  const admin = createAdminClient();
  const { error: profileError } = await admin
    .from("profiles")
    .insert(buildStudentProfileInsert(user.id, validated));

  if (profileError) {
    console.error(
      "[auth] profile insert failed tras signUp:",
      profileError.message,
    );
    // Sin profile la cuenta de Auth queda huérfana (login la rechazaría de
    // todas formas — ver login/actions.ts): se revierte para no dejar un
    // usuario "roto" a medio crear.
    await admin.auth.admin.deleteUser(user.id);
    return { error: GENERIC_ERROR };
  }

  if (!signUpData.session) {
    // Confirm Email está desactivado en este proyecto (comprobado en el
    // dashboard de Supabase): un signUp con éxito SIEMPRE debería devolver
    // sesión. Si no la hay, es un estado inesperado (p.ej. alguien
    // reactivó la confirmación de email sin avisar) — se trata como error
    // genérico en vez de mostrar un mensaje de "revisa tu correo" que ya
    // no sería cierto para el flujo actual.
    console.error(
      "[auth] signUp sin error pero sin sesión (¿Confirm Email reactivado?)",
    );
    await admin.auth.admin.deleteUser(user.id);
    return { error: GENERIC_ERROR };
  }

  redirect(destinationForRole("student"));
}

function mapSignUpError(error: { message: string; code?: string }): string {
  if (
    error.code === "user_already_exists" ||
    /already registered/i.test(error.message)
  ) {
    return EMAIL_IN_USE;
  }
  if (error.code === "weak_password") {
    return "La contraseña no cumple los requisitos de seguridad.";
  }
  console.error("[auth] signUp failed:", error.code, error.message);
  return GENERIC_ERROR;
}
