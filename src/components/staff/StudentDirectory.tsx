import Link from "next/link";

import { StatusMark } from "@/components/staff/StatusMark";
import { formatDegreeCourse } from "@/lib/academic";
import { formatPunchDate, formatPunchTime } from "@/lib/punches/format";
import type { RosterEntry } from "@/lib/staff/roster";

export function StudentDirectory({ entries }: { entries: RosterEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="border-t border-ink py-8 text-sm text-ink-dim">
        No hay alumnos que coincidan con la búsqueda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border-t border-ink">
      <table className="w-full min-w-[680px] border-collapse font-mono text-sm">
        <thead>
          <tr className="border-b border-dashed border-line text-left text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
            <th scope="col" className="py-3 pr-4 font-normal">
              Alumno
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              Grupo
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              Estado
            </th>
            <th scope="col" className="py-3 font-normal">
              Última actividad
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
                <div className="text-xs normal-case tracking-normal text-ink-faint">
                  {entry.email}
                </div>
              </td>
              <td className="py-3 pr-4 text-ink-dim">
                {formatDegreeCourse(entry.degree, entry.course) ?? "-"}
              </td>
              <td className="py-3 pr-4">
                <StatusMark state={entry.state} />
              </td>
              <td className="py-3 text-ink-dim">
                {entry.lastPunchAt
                  ? `${formatPunchDate(entry.lastPunchAt)} · ${formatPunchTime(entry.lastPunchAt)}`
                  : "Sin fichajes"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
