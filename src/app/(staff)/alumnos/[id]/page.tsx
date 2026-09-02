import Link from "next/link";
import { notFound } from "next/navigation";

import { PunchHistory } from "@/components/student/PunchHistory";
import { StatusMark } from "@/components/staff/StatusMark";
import { formatDegreeCourse } from "@/lib/academic";
import { requireRole } from "@/lib/auth/session";
import { getCurrentPunchState } from "@/lib/punches/queries";
import { pairPunchesIntoWorkdays } from "@/lib/punches/workday";
import { getStudentProfile, getStudentPunches } from "@/lib/staff/queries";

// Igual criterio que /historial del alumno: se piden jornadas (pares de
// punches), no punches sueltos, para no partir una jornada entre páginas.
const WORKDAYS_PER_PAGE = 10;

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole(["teacher", "admin"]);

  const { id } = await params;

  // getStudentProfile exige explícitamente role = 'student': si el id es de
  // otro profesor/admin, o no existe, esto es null y se responde 404 — la
  // URL nunca decide por sí sola qué se puede consultar (IDOR, §9).
  const student = await getStudentProfile(id);
  if (!student) notFound();

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const limit = WORKDAYS_PER_PAGE * 2;
  const offset = (page - 1) * limit;

  // Estado actual siempre desde el último punch real, sin importar en qué
  // página de historial esté el profesor (mismo helper que usa el alumno
  // para sí mismo).
  const [{ state }, punches] = await Promise.all([
    getCurrentPunchState(student.id),
    getStudentPunches(student.id, limit + 1, offset),
  ]);

  const hasNextPage = punches.length > limit;
  const workdays = pairPunchesIntoWorkdays(punches.slice(0, limit));

  return (
    <div>
      <Link
        href="/alumnos"
        className="font-mono text-xs uppercase tracking-wide text-ink-dim underline decoration-line-strong underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
      >
        ← Alumnos
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div>
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
            Expediente
          </span>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">
            {student.name}
          </h1>
          <p className="mt-1 text-sm text-ink-dim">{student.email}</p>
        </div>
        <div className="text-right">
          <StatusMark state={state} />
          <p className="mt-2 font-mono text-xs text-ink-faint">
            {formatDegreeCourse(student.degree, student.course) ?? "Sin grupo"}
          </p>
        </div>
      </div>

      {!student.active && (
        <p className="mt-4 border border-danger bg-danger-soft px-4 py-2 text-sm text-danger">
          Esta cuenta está desactivada.
        </p>
      )}

      <h2 className="mt-10 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        Archivo de jornadas
      </h2>
      <PunchHistory workdays={workdays} />

      {(page > 1 || hasNextPage) && (
        <nav
          className="mt-6 flex items-center justify-between font-mono text-xs uppercase tracking-wide"
          aria-label="Paginación del archivo"
        >
          {page > 1 ? (
            <Link
              href={
                page === 2
                  ? `/alumnos/${student.id}`
                  : `/alumnos/${student.id}?page=${page - 1}`
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
              href={`/alumnos/${student.id}?page=${page + 1}`}
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
