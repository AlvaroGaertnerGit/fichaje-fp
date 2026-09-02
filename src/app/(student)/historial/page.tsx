import Link from "next/link";

import { PunchHistory } from "@/components/student/PunchHistory";
import { requireRole } from "@/lib/auth/session";
import { getMyPunches } from "@/lib/punches/queries";
import { pairPunchesIntoWorkdays } from "@/lib/punches/workday";

// Jornadas por página, no punches: cada jornada son 2 filas (IN+OUT), así
// que se piden siempre múltiplos de 2 para no partir una jornada entre
// páginas (los punches alternan IN/OUT estrictamente, así que cualquier
// bloque par tomado desde el más reciente cae siempre en un límite de
// jornada completa).
const WORKDAYS_PER_PAGE = 10;

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole(["student"]);

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const limit = WORKDAYS_PER_PAGE * 2;
  const offset = (page - 1) * limit;
  // Se piden `limit + 1` para saber si hay página siguiente sin una
  // segunda consulta de conteo.
  const punches = await getMyPunches(limit + 1, offset);
  const hasNextPage = punches.length > limit;
  const workdays = pairPunchesIntoWorkdays(punches.slice(0, limit));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        Registro
      </span>
      <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">Archivo de jornadas</h1>

      <PunchHistory workdays={workdays} />

      {(page > 1 || hasNextPage) && (
        <nav
          className="mt-6 flex items-center justify-between font-mono text-xs uppercase tracking-wide"
          aria-label="Paginación del archivo"
        >
          {page > 1 ? (
            <Link
              href={page === 2 ? "/historial" : `/historial?page=${page - 1}`}
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
              href={`/historial?page=${page + 1}`}
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
