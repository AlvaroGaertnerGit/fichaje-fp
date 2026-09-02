import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Cliente con la Secret Key (service_role): bypassa RLS por completo.
 * `server-only` impide que este módulo pueda llegar nunca a un bundle de
 * cliente. Uso exclusivo: crear/reparar la fila de `profiles` justo después
 * de que Supabase Auth cree el usuario real (ver src/app/(auth)/registro),
 * exactamente el flujo ya documentado en
 * supabase/migrations/20260902140325_create_core_schema.sql — "la fila de
 * profiles se crea explícitamente desde el servidor". No usar para nada que
 * un cliente autenticado normal (RLS + publishable key) pueda resolver por
 * sí mismo.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
