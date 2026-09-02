import Link from "next/link";

import { ActiveMark } from "@/components/admin/ActiveMark";
import { formatDegreeCourse } from "@/lib/academic";
import type { AdminUserRow } from "@/lib/admin/queries";
import { formatRoleLabel } from "@/lib/admin/roles";
import { formatPunchDate, formatPunchTime } from "@/lib/punches/format";

export function AdminUserTable({ entries }: { entries: AdminUserRow[] }) {
  if (entries.length === 0) {
    return (
      <p className="border-t border-ink py-8 text-sm text-ink-dim">
        No hay usuarios que coincidan con los filtros.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border-t border-ink">
      <table className="w-full min-w-[760px] border-collapse font-mono text-sm">
        <thead>
          <tr className="border-b border-dashed border-line text-left text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
            <th scope="col" className="py-3 pr-4 font-normal">
              Usuario
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              Grupo
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              Rol
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
                  href={`/admin/usuarios/${entry.id}`}
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
              <td className="py-3 pr-4 text-ink-dim">{formatRoleLabel(entry.role)}</td>
              <td className="py-3 pr-4">
                <ActiveMark active={entry.active} />
              </td>
              <td className="py-3 text-ink-dim">
                {entry.lastActivityAt
                  ? `${formatPunchDate(entry.lastActivityAt)} · ${formatPunchTime(entry.lastActivityAt)}`
                  : "Sin fichajes"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
