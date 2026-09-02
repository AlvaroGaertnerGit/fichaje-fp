import Link from "next/link";

import { ActivityLog } from "@/components/staff/ActivityLog";
import { requireRole } from "@/lib/auth/session";
import { getGlobalActivity } from "@/lib/staff/queries";

// Registro plano de punches (no de jornadas emparejadas): con punches de
// varios alumnos entrelazados cronológicamente, emparejar IN/OUT aquí
// podría partir la jornada de un alumno entre dos páginas. El
// emparejamiento por jornadas se reserva para /alumnos/[id] (un solo
// alumno, sin entrelazado).
export default async function HistorialGlobalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole(["teacher", "admin"]);

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { entries, hasNextPage } = await getGlobalActivity(page);

  return (
    <div>
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        Registro
      </span>
      <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">
        Historial de fichajes
      </h1>

      <ActivityLog entries={entries} showDate />

      {(page > 1 || hasNextPage) && (
        <nav
          className="mt-6 flex items-center justify-between font-mono text-xs uppercase tracking-wide"
          aria-label="Paginación del historial"
        >
          {page > 1 ? (
            <Link
              href={
                page === 2
                  ? "/historial-global"
                  : `/historial-global?page=${page - 1}`
              }
              className="text-ink underline decoration-line-strong underline-offset-4 hover:text-stamp"
            >
              ← Más recientes
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-faint">Página {page}</span>
          {hasNextPage ? (
            <Link
              href={`/historial-global?page=${page + 1}`}
              className="text-ink underline decoration-line-strong underline-offset-4 hover:text-stamp"
            >
              Más antiguas →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
