import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Course, Degree, Json, Profile, PunchType, UserRole } from "@/types";

// Todas las lecturas de este archivo usan el cliente normal (publishable
// key, RLS) — nunca createAdminClient(). Admin ya tiene SELECT vía RLS
// existente (private.user_role() = 'admin'); usar la Secret Key aquí sería
// redundante y normalizaría "admin = bypass total" (Fase 6.0 §5/§12/§26).

// ============================================================================
// Dashboard
// ============================================================================

export type AdminDashboardStats = {
  totalUsers: number;
  students: number;
  teachers: number;
  admins: number;
  active: number;
  inactive: number;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("role, active");

  if (error || !data) {
    return { totalUsers: 0, students: 0, teachers: 0, admins: 0, active: 0, inactive: 0 };
  }

  return {
    totalUsers: data.length,
    students: data.filter((p) => p.role === "student").length,
    teachers: data.filter((p) => p.role === "teacher").length,
    admins: data.filter((p) => p.role === "admin").length,
    active: data.filter((p) => p.active).length,
    inactive: data.filter((p) => !p.active).length,
  };
}

// ============================================================================
// Listado de usuarios (activos e inactivos, con filtros)
// ============================================================================

export type AdminUserFilters = {
  q?: string;
  role?: UserRole | "all";
  status?: "active" | "inactive" | "all";
  degree?: Degree | "all";
  course?: Course | "all";
};

export type AdminUserRow = Profile & { lastActivityAt: string | null };

/**
 * A diferencia de getStudentDirectory (src/lib/staff/queries.ts), que solo
 * lista alumnos activos: aquí Admin necesita ver activos e inactivos, y
 * cualquier rol — es la propia intención de esta pantalla (Fase 6.1 §4).
 */
export async function getAdminUserList(
  filters: AdminUserFilters = {},
): Promise<AdminUserRow[]> {
  const supabase = await createClient();

  let query = supabase.from("profiles").select("*").order("name", { ascending: true });

  if (filters.role && filters.role !== "all") {
    query = query.eq("role", filters.role);
  }
  if (filters.status === "active") {
    query = query.eq("active", true);
  } else if (filters.status === "inactive") {
    query = query.eq("active", false);
  }
  if (filters.degree && filters.degree !== "all") {
    query = query.eq("degree", filters.degree);
  }
  if (filters.course && filters.course !== "all") {
    query = query.eq("course", filters.course);
  }

  const term = filters.q?.trim();
  if (term) {
    // Mismo escapado que getStudentDirectory: una coma o paréntesis en la
    // búsqueda no debe romper la sintaxis de `.or()` de PostgREST.
    const escaped = term.replace(/[\\"]/g, "\\$&").replace(/[%_]/g, "\\$&");
    const pattern = `"%${escaped}%"`;
    query = query.or(`name.ilike.${pattern},email.ilike.${pattern}`);
  }

  const { data: profiles, error: profilesError } = await query;
  if (profilesError || !profiles) return [];

  const { data: latest } = await supabase
    .from("latest_punches")
    .select("user_id, timestamp");

  const latestByUser = new Map(
    (latest ?? [])
      .filter((p): p is { user_id: string; timestamp: string } =>
        Boolean(p.user_id && p.timestamp),
      )
      .map((p) => [p.user_id, p.timestamp]),
  );

  return profiles.map((profile) => ({
    ...profile,
    lastActivityAt: latestByUser.get(profile.id) ?? null,
  }));
}

// ============================================================================
// Detalle de usuario
// ============================================================================

/**
 * A diferencia de getStudentProfile (que exige role='student' a propósito,
 * porque esa ruta es solo para alumnos), aquí Admin necesita poder abrir
 * el expediente de cualquier rol — es la intención de esta pantalla.
 */
export async function getAdminUserDetail(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export type UserPunchEntry = {
  id: string;
  type: PunchType;
  timestamp: string;
};

export async function getUserPunches(
  userId: string,
  limit = 20,
): Promise<UserPunchEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("punches")
    .select("id, type, timestamp")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

// ============================================================================
// Auditoría
// ============================================================================

export type AuditLogEntry = {
  id: string;
  action: string;
  createdAt: string;
  actorName: string;
  targetName: string | null;
  ipAddress: string | null;
  metadata: Json;
};

// Las dos claves foráneas de audit_logs hacia profiles (user_id = actor,
// target_user_id = objetivo) necesitan el hint de nombre de constraint
// explícito para que PostgREST sepa qué embed corresponde a cuál — ver
// Relationships en src/types/database.ts.
const AUDIT_LOG_SELECT =
  "id, action, created_at, ip_address, metadata, " +
  "actor:profiles!audit_logs_user_id_fkey(name), " +
  "target:profiles!audit_logs_target_user_id_fkey(name)";

type AuditLogRow = {
  id: string;
  action: string;
  created_at: string;
  ip_address: unknown;
  metadata: Json;
  actor: { name: string } | null;
  target: { name: string } | null;
};

function mapAuditRow(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    action: row.action,
    createdAt: row.created_at,
    actorName: row.actor?.name ?? "Usuario eliminado",
    targetName: row.target?.name ?? null,
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    metadata: row.metadata,
  };
}

export async function getRecentAuditActivity(limit = 8): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select(AUDIT_LOG_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AuditLogRow[]>();

  if (error || !data) return [];
  return data.map(mapAuditRow);
}

const AUDIT_PAGE_SIZE = 25;

export async function getAuditLogPage(
  page: number,
): Promise<{ entries: AuditLogEntry[]; hasNextPage: boolean }> {
  const supabase = await createClient();
  const offset = (page - 1) * AUDIT_PAGE_SIZE;

  const { data, error } = await supabase
    .from("audit_logs")
    .select(AUDIT_LOG_SELECT)
    .order("created_at", { ascending: false })
    .range(offset, offset + AUDIT_PAGE_SIZE)
    .returns<AuditLogRow[]>();

  if (error || !data) return { entries: [], hasNextPage: false };

  const hasNextPage = data.length > AUDIT_PAGE_SIZE;
  return { entries: data.slice(0, AUDIT_PAGE_SIZE).map(mapAuditRow), hasNextPage };
}

/** Acciones administrativas de las que este usuario fue objetivo — para su expediente. */
export async function getUserAuditHistory(
  userId: string,
  limit = 10,
): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select(AUDIT_LOG_SELECT)
    .eq("target_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AuditLogRow[]>();

  if (error || !data) return [];
  return data.map(mapAuditRow);
}

const ACTION_LABELS: Record<string, string> = {
  user_created: "Usuario creado",
  role_changed: "Rol cambiado",
  user_deactivated: "Usuario desactivado",
  user_reactivated: "Usuario reactivado",
  punch_corrected: "Fichaje corregido",
};

export function formatAuditAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
