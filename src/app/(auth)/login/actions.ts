"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { destinationForRole } from "@/lib/auth/session";

export type LoginState = { error: string } | null;

// Mensaje único para credenciales incorrectas, email inexistente y cuenta
// autenticada sin profile: distinguirlos permitiría averiguar si un email
// concreto existe en el sistema.
const INVALID_CREDENTIALS_MESSAGE =
  "No se ha podido iniciar sesión. Comprueba tus credenciales e inténtalo de nuevo.";

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Introduce tu email y tu contraseña." };
  }

  const supabase = await createClient();

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.user) {
    console.error("[auth] signInWithPassword failed:", signInError?.message);
    return { error: INVALID_CREDENTIALS_MESSAGE };
  }

  // A partir de aquí la contraseña ya es correcta: revelar que la cuenta
  // existe (o que está desactivada) ya no filtra nada que un atacante no
  // supiera. Un usuario sin profile es un estado inválido, nunca se deja
  // entrar con la contraseña correcta pero sin datos de aplicación.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", signInData.user.id)
    .single();

  if (profileError || !profile) {
    console.error(
      "[auth] usuario autenticado sin profile:",
      signInData.user.id,
      profileError?.message
    );
    await supabase.auth.signOut();
    return { error: INVALID_CREDENTIALS_MESSAGE };
  }

  if (!profile.active) {
    redirect("/cuenta-desactivada");
  }

  redirect(destinationForRole(profile.role));
}
