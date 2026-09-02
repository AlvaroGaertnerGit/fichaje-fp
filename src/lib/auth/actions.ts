"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Cierra la sesión y redirige a /login. Server Action compartida: se usa
 * como `action` de un `<form>` simple, sin necesitar un Client Component.
 */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
