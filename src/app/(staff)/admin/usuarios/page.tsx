import Link from "next/link";

import { AdminUserFilters } from "@/components/admin/AdminUserFilters";
import { AdminUserTable } from "@/components/admin/AdminUserTable";
import { buttonClassName } from "@/components/ui/button";
import { getAdminUserList } from "@/lib/admin/queries";
import type { Course, Degree, UserRole } from "@/types";

type RawSearchParams = {
  q?: string;
  role?: string;
  status?: string;
  degree?: string;
  course?: string;
};

function asRoleFilter(value: string | undefined): UserRole | "all" {
  return value === "student" || value === "teacher" || value === "admin"
    ? value
    : "all";
}

function asStatusFilter(value: string | undefined): "active" | "inactive" | "all" {
  return value === "active" || value === "inactive" ? value : "all";
}

function asDegreeFilter(value: string | undefined): Degree | "all" {
  return value === "SMR" || value === "ASIR" ? value : "all";
}

function asCourseFilter(value: string | undefined): Course | "all" {
  return value === "1" || value === "2" ? value : "all";
}

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;

  const entries = await getAdminUserList({
    q: params.q,
    role: asRoleFilter(params.role),
    status: asStatusFilter(params.status),
    degree: asDegreeFilter(params.degree),
    course: asCourseFilter(params.course),
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
            Registro
          </span>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">Usuarios</h1>
        </div>
        <Link href="/admin/usuarios/nuevo" className={buttonClassName("primary")}>
          Nuevo usuario
        </Link>
      </div>

      <AdminUserFilters filters={params} />

      <div className="mt-6">
        <AdminUserTable entries={entries} />
      </div>
    </div>
  );
}
