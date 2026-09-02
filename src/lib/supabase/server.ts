import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route
 * Handlers. Usa la clave pública (publishable): la sesión se identifica por
 * cookies, RLS sigue aplicando por fila con el rol `authenticated`.
 *
 * No usar en Client Components ("use client") — ver src/lib/supabase/client.ts.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // set() llamado desde un Server Component (no puede escribir
            // cookies). La sesión se refresca en proxy.ts (Fase 2); aquí se
            // puede ignorar con seguridad.
          }
        },
      },
    }
  );
}
