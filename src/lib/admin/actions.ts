"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/network/allowed-ip";
import type { Profile } from "@/types";
import type { Database } from "@/types/database";

import { generateTemporaryPassword } from "./password";
import { validateNewUserInput, type NewUserInput } from "./create-user";
import { isSelfTarget } from "./guards";
import { isAssignableRole, type AssignableRole } from "./roles";

// Todas las Server Actions de este archivo siguen siempre el mismo orden
// (Fase 6.0 §5/§13, Fase 6.1 §24):
//
//   requireRole(['admin']) -> validar input -> releer target de BD ->
//   guards de negocio -> createAdminClient() -> operación
//
// `createAdminClient()` (Secret Key) nunca se llama sin que la línea
// anterior en la misma función sea `requireRole(['admin'])`. Ninguna
// función acepta actorId/actorRole/active/targetRole=admin del cliente: la
// identidad y el rol del actor salen siempre de la sesión de servidor ya
// verificada, nunca de un parámetro.

const GENERIC_ERROR = "No se ha podido completar la operación. Inténtalo de nuevo.";
const EMAIL_IN_USE = "Ya existe una cuenta con este correo.";

// Duración de baneo "permanente" en la Admin API de Supabase (no admite un
// valor infinito real, solo una duración) — 100 años cubre con margen
// cualquier desactivación real de este proyecto. Revertido a "none" al
// reactivar (ver deactivateUser/activateUser más abajo).
const BAN_DURATION_ON_DEACTIVATE = "876000h";
const BAN_DURATION_UNBAN = "none";

async function currentIp(): Promise<string | null> {
  const hdrs = await headers();
  return getClientIp(hdrs);
}

async function readTargetProfile(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * Traduce el prefijo `label:` de las excepciones lanzadas por las
 * funciones SQL (admin_change_role/admin_set_active/admin_create_profile,
 * ver supabase/migrations/20260902200500_admin_functions.sql) a un mensaje
 * en español para la UI. La fuente de verdad de estas reglas es siempre la
 * función SQL, no este mapeo — si la función rechaza algo que este switch
 * no reconoce, se cae al mensaje genérico.
 */
function friendlyRpcError(message: string | undefined): string {
  const label = message?.split(":")[0]?.trim();
  switch (label) {
    case "self_role_change_forbidden":
      return "No puedes cambiar tu propio rol.";
    case "self_deactivation_forbidden":
      return "No puedes desactivar tu propia cuenta.";
    case "admin_creation_forbidden":
      return "No se puede asignar el rol admin desde aquí.";
    case "last_admin_guard":
      return "Esta operación dejaría el sistema sin ningún administrador activo.";
    case "target_not_found":
      return "El usuario ya no existe.";
    case "not_authorized":
      return "No tienes permiso para realizar esta operación.";
    default:
      return GENERIC_ERROR;
  }
}

// ============================================================================
// Crear usuario (student | teacher — nunca admin, Fase 6.0 §3)
// ============================================================================

export type CreateUserState =
  | null
  | { success: false; error: string }
  | {
      success: true;
      user: { id: string; name: string; email: string; role: AssignableRole };
      temporaryPassword: string;
    };

/**
 * Alta de usuario por Admin. Flujo (Fase 6.0 §4/§11-B, saga con
 * compensación explícita — auth.users y Postgres son sistemas distintos,
 * no puede ser una única transacción real):
 *
 *   requireRole(['admin'])
 *     -> validar input (role cerrado a student|teacher)
 *     -> generar contraseña temporal (server-only, criptográfica)
 *     -> auth.admin.createUser() [email_confirm: true, sin invitación]
 *     -> admin_create_profile() [profile + audit_log, atómico]
 *     -> si falla lo segundo: deleteUser() de compensación
 *
 * El nuevo usuario nunca queda autenticado como resultado de esta
 * operación (a diferencia de /registro, que usa signUp()): el admin no se
 * autentica en su nombre, solo crea la cuenta.
 */
export async function createStaffOrStudentUser(
  _prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const actor = await requireRole(["admin"]);

  const validated = validateNewUserInput({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
    degree: String(formData.get("degree") ?? ""),
    course: String(formData.get("course") ?? ""),
  } satisfies NewUserInput);

  if ("error" in validated) {
    return { success: false, error: validated.error };
  }

  const temporaryPassword = generateTemporaryPassword();
  const admin = createAdminClient();
  const ip = await currentIp();

  // 1: Auth. `email_confirm: true` porque Confirm Email está desactivado
  // en este proyecto (ver supabase/README.md) y no queremos depender de
  // envío de correo transaccional para dar de alta a un profesor (Fase
  // 6.0 §9/§10 — se pospone explícitamente inviteUserByEmail()).
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: validated.email,
    password: temporaryPassword,
    email_confirm: true,
  });

  if (createError || !created.user) {
    console.error("[admin] createUser failed:", createError?.code, createError?.message);
    if (
      createError?.code === "email_exists" ||
      /already registered|already exists/i.test(createError?.message ?? "")
    ) {
      return { success: false, error: EMAIL_IN_USE };
    }
    return { success: false, error: GENERIC_ERROR };
  }

  // 2: profile + audit log, atómico (función SQL).
  const { data: profile, error: rpcError } = await admin.rpc("admin_create_profile", {
    p_actor_id: actor.id,
    p_target_id: created.user.id,
    p_name: validated.name,
    p_email: validated.email,
    p_role: validated.role,
    // El generador de tipos no refleja que los parámetros de una función
    // Postgres son nullable salvo que se restrinjan explícitamente (no es
    // el caso aquí, ver admin_create_profile): degree/course son
    // legítimamente null para un teacher, la función los acepta tal cual.
    p_degree: validated.degree as Database["public"]["Enums"]["degree"],
    p_course: validated.course as Database["public"]["Enums"]["course"],
    p_ip: ip,
  });

  if (rpcError || !profile) {
    console.error(
      "[admin] admin_create_profile failed tras createUser:",
      rpcError?.message,
      "auth user:",
      created.user.id,
    );
    // 3: compensación. Sin profile, la cuenta de Auth queda huérfana (no
    // hay ninguna vía de la app que la trate como válida — igual que en
    // /registro): se revierte para no dejar un usuario a medio crear.
    const { error: deleteError } = await admin.auth.admin.deleteUser(created.user.id);
    if (deleteError) {
      console.error(
        "[admin] ROLLBACK FALLÓ — usuario huérfano en auth.users, requiere limpieza manual:",
        created.user.id,
        deleteError.message,
      );
    }
    return { success: false, error: GENERIC_ERROR };
  }

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin");

  return {
    success: true,
    user: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role as AssignableRole,
    },
    temporaryPassword,
  };
}

// ============================================================================
// Cambiar rol / activar / desactivar
// ============================================================================

export type MutationResult = { success: true } | { success: false; error: string };

export async function changeUserRole(
  targetId: string,
  newRole: string,
): Promise<MutationResult> {
  const actor = await requireRole(["admin"]);

  if (!isAssignableRole(newRole)) {
    return { success: false, error: "Selecciona un rol válido." };
  }
  // Capa 1 (JS) de la guarda duplicada — la capa 2 (SQL, la que realmente
  // decide) está en admin_change_role.
  if (isSelfTarget(actor.id, targetId)) {
    return { success: false, error: "No puedes cambiar tu propio rol." };
  }

  const target = await readTargetProfile(targetId);
  if (!target) {
    return { success: false, error: "El usuario ya no existe." };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_change_role", {
    p_actor_id: actor.id,
    p_target_id: targetId,
    p_new_role: newRole,
    p_ip: await currentIp(),
  });

  if (error) {
    console.error("[admin] admin_change_role failed:", error.message);
    return { success: false, error: friendlyRpcError(error.message) };
  }

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${targetId}`);
  revalidatePath("/admin");

  return { success: true };
}

export async function activateUser(targetId: string): Promise<MutationResult> {
  const actor = await requireRole(["admin"]);

  const target = await readTargetProfile(targetId);
  if (!target) {
    return { success: false, error: "El usuario ya no existe." };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_set_active", {
    p_actor_id: actor.id,
    p_target_id: targetId,
    p_active: true,
    p_ip: await currentIp(),
  });

  if (error) {
    console.error("[admin] admin_set_active(true) failed:", error.message);
    return { success: false, error: friendlyRpcError(error.message) };
  }

  // Revierte el baneo de login puesto al desactivar (best-effort, ver
  // deactivateUser). Si esto falla, el usuario simplemente sigue baneado
  // hasta que se reintente — no bloquea la reactivación real (`active`
  // en `profiles`, ya confirmada arriba).
  const { error: unbanError } = await admin.auth.admin.updateUserById(targetId, {
    ban_duration: BAN_DURATION_UNBAN,
  });
  if (unbanError) {
    console.warn("[admin] no se pudo revertir el baneo al reactivar:", targetId, unbanError.message);
  }

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${targetId}`);
  revalidatePath("/admin");
  revalidatePath("/alumnos");

  return { success: true };
}

export async function deactivateUser(targetId: string): Promise<MutationResult> {
  const actor = await requireRole(["admin"]);

  if (isSelfTarget(actor.id, targetId)) {
    return { success: false, error: "No puedes desactivar tu propia cuenta." };
  }

  const target = await readTargetProfile(targetId);
  if (!target) {
    return { success: false, error: "El usuario ya no existe." };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_set_active", {
    p_actor_id: actor.id,
    p_target_id: targetId,
    p_active: false,
    p_ip: await currentIp(),
  });

  if (error) {
    console.error("[admin] admin_set_active(false) failed:", error.message);
    return { success: false, error: friendlyRpcError(error.message) };
  }

  // Best-effort: impide que el usuario desactivado vuelva a iniciar sesión
  // o refresque su token (banned_until en auth.users). Esto NO invalida un
  // access token ya emitido y todavía no caducado — eso es lo que ya
  // resuelve el endurecimiento de private.user_role() aplicado en la
  // migración 20260902200000 (Fase 6.0 §7/§18): esa es la barrera real
  // para "sesión antigua tras desactivar", esto es higiene adicional, no
  // un sustituto.
  const { error: banError } = await admin.auth.admin.updateUserById(targetId, {
    ban_duration: BAN_DURATION_ON_DEACTIVATE,
  });
  if (banError) {
    console.warn("[admin] no se pudo banear el login tras desactivar:", targetId, banError.message);
  }

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${targetId}`);
  revalidatePath("/admin");
  revalidatePath("/alumnos");

  return { success: true };
}
