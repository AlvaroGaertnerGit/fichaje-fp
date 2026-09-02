import Link from "next/link";

import { formatDegreeCourse } from "@/lib/academic";
import { formatPunchTime } from "@/lib/punches/format";
import { formatDuration } from "@/lib/punches/workday";
import type { RosterEntry } from "@/lib/staff/roster";

// "Tiempo transcurrido" se calcula una vez, en el render de servidor: nada
// de un contador con tick en cliente (§18 de la Fase 5, sin animaciones
// gratuitas ni counters).
export function WorkingRoster({
  entries,
  now,
}: {
  entries: RosterEntry[];
  now: number;
}) {
  if (entries.length === 0) {
    return (
      <p className="border-t border-ink py-8 text-sm text-ink-dim">
        Nadie está en jornada ahora mismo.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border-t border-ink">
      <table className="w-full min-w-[520px] border-collapse font-mono text-sm">
        <thead>
          <tr className="border-b border-dashed border-line text-left text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
            <th scope="col" className="py-3 pr-4 font-normal">
              Alumno
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              Grupo
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              Entrada
            </th>
            <th scope="col" className="py-3 font-normal">
              Tiempo
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-dashed border-line last:border-b-0"
            >
              <td className="py-3 pr-4">
                <Link
                  href={`/alumnos/${entry.id}`}
                  className="text-ink underline decoration-line-strong underline-offset-4 hover:text-stamp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
                >
                  {entry.name}
                </Link>
              </td>
              <td className="py-3 pr-4 text-ink-dim">
                {formatDegreeCourse(entry.degree, entry.course) ?? "-"}
              </td>
              <td className="py-3 pr-4 text-ink-dim">
                {entry.lastPunchAt ? formatPunchTime(entry.lastPunchAt) : "-"}
              </td>
              <td className="py-3 text-ink-dim">
                {entry.lastPunchAt
                  ? formatDuration(now - new Date(entry.lastPunchAt).getTime())
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
