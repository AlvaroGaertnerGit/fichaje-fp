import "server-only";

import { formatDegreeCourse } from "@/lib/academic";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Punch, PunchType } from "@/types";

import {
  buildRoster,
  type LatestPunchByUser,
  type RosterEntry,
} from "./roster";

/**
 * Roster de alumnos activos con su estado actual (WORKING/OUTSIDE), en 2
 * consultas fijas (perfiles + `latest_punches`) sin importar cuántos
 * alumnos haya — nunca N+1. `latest_punches` ya trae RLS heredado de
 * `punches` (security_invoker), así que esto sigue viendo exactamente lo
 * que la policy `punches_select` permite a teacher/admin: todo.
 */
export async function getStudentRoster(): Promise<RosterEntry[]> {
  const supabase = await createClient();

  const [
    { data: profiles, error: profilesError },
    { data: latest, error: latestError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, degree, course")
      .eq("role", "student")
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase.from("latest_punches").select("user_id, type, timestamp"),
  ]);

  if (profilesError || latestError || !profiles) return [];

  const latestByUser: LatestPunchByUser = new Map(
    (latest ?? [])
      .filter(
        (p): p is { user_id: string; type: PunchType; timestamp: string } =>
          Boolean(p.user_id && p.type && p.timestamp),
      )
      .map((p) => [p.user_id, { type: p.type, timestamp: p.timestamp }]),
  );

  return buildRoster(profiles, latestByUser);
}

export type ActivityEntry = {
  id: string;
  type: PunchType;
  timestamp: string;
  studentName: string;
  academicGroup: string | null;
};

/** Últimos punches de todos los alumnos, más recientes primero. Una sola consulta (embed FK). */
export async function getRecentActivity(limit = 15): Promise<ActivityEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("punches")
    .select("id, type, timestamp, profiles(name, degree, course)")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    type: p.type,
    timestamp: p.timestamp,
    studentName: p.profiles?.name ?? "Alumno eliminado",
    academicGroup: formatDegreeCourse(
      p.profiles?.degree ?? null,
      p.profiles?.course ?? null,
    ),
  }));
}

const HISTORY_PAGE_SIZE = 20;

/** Actividad global paginada (todos los alumnos), más reciente primero. */
export async function getGlobalActivity(
  page: number,
): Promise<{ entries: ActivityEntry[]; hasNextPage: boolean }> {
  const supabase = await createClient();
  const offset = (page - 1) * HISTORY_PAGE_SIZE;

  const { data, error } = await supabase
    .from("punches")
    .select("id, type, timestamp, profiles(name, degree, course)")
    .order("timestamp", { ascending: false })
    .range(offset, offset + HISTORY_PAGE_SIZE);

  if (error || !data) return { entries: [], hasNextPage: false };

  const hasNextPage = data.length > HISTORY_PAGE_SIZE;
  const entries = data.slice(0, HISTORY_PAGE_SIZE).map((p) => ({
    id: p.id,
    type: p.type,
    timestamp: p.timestamp,
    studentName: p.profiles?.name ?? "Alumno eliminado",
    academicGroup: formatDegreeCourse(
      p.profiles?.degree ?? null,
      p.profiles?.course ?? null,
    ),
  }));

  return { entries, hasNextPage };
}

/**
 * Directorio de alumnos activos, opcionalmente filtrado por nombre/email.
 * El filtrado se hace en servidor vía `ilike` (no se trae la tabla entera
 * al cliente para filtrar en el navegador). Grado/curso quedan fuera del
 * texto libre a propósito: son enums, no texto, y ese filtrado por
 * dropdown queda para una fase futura ("no implementar filtros avanzados
 * todavía").
 */
export async function getStudentDirectory(
  search?: string,
): Promise<RosterEntry[]> {
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, name, email, degree, course")
    .eq("role", "student")
    .eq("active", true)
    .order("name", { ascending: true });

  const term = search?.trim();
  if (term) {
    // Comillas alrededor del valor: así una coma o paréntesis en la
    // búsqueda no rompe la sintaxis de `.or()` de PostgREST (que usa
    // coma/paréntesis como separadores estructurales).
    const escaped = term.replace(/[\\"]/g, "\\$&").replace(/[%_]/g, "\\$&");
    const pattern = `"%${escaped}%"`;
    query = query.or(`name.ilike.${pattern},email.ilike.${pattern}`);
  }

  const { data: profiles, error: profilesError } = await query;
  if (profilesError || !profiles) return [];

  const { data: latest, error: latestError } = await supabase
    .from("latest_punches")
    .select("user_id, type, timestamp");
  if (latestError) return buildRoster(profiles, new Map());

  const latestByUser: LatestPunchByUser = new Map(
    (latest ?? [])
      .filter(
        (p): p is { user_id: string; type: PunchType; timestamp: string } =>
          Boolean(p.user_id && p.type && p.timestamp),
      )
      .map((p) => [p.user_id, { type: p.type, timestamp: p.timestamp }]),
  );

  return buildRoster(profiles, latestByUser);
}

/**
 * Expediente de un alumno concreto. Filtra explícitamente `role = 'student'`
 * además del `id`: esta ruta es exclusivamente para consultar alumnos, así
 * que un id que resulte ser otro profesor/admin no debe "encontrarse" aquí
 * (evita filtrar por accidente que ese id pertenece a otro miembro de staff).
 * RLS ya impediría a un alumno consultar esto (requireRole se encarga antes);
 * esto es la capa adicional de "¿es realmente un alumno?".
 */
export async function getStudentProfile(id: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "student")
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

/** Historial de punches de un alumno concreto (para /alumnos/[id]). */
export async function getStudentPunches(
  studentId: string,
  limit = 20,
  offset = 0,
): Promise<Punch[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("punches")
    .select("*")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return [];
  return data ?? [];
}
