// Alias de conveniencia derivados de Database (src/types/database.ts).
// No redefinir campos a mano aquí: si el esquema cambia, database.ts se
// regenera y estos tipos se actualizan solos.

import type { Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Punch = Database["public"]["Tables"]["punches"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type LatestPunch = Database["public"]["Views"]["latest_punches"]["Row"];

export type UserRole = Database["public"]["Enums"]["user_role"];
export type PunchType = Database["public"]["Enums"]["punch_type"];
export type Degree = Database["public"]["Enums"]["degree"];
export type Course = Database["public"]["Enums"]["course"];
