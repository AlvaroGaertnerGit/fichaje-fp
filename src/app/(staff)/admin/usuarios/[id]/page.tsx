import Link from "next/link";
import { notFound } from "next/navigation";

import { ActiveMark } from "@/components/admin/ActiveMark";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { UserActions } from "@/components/admin/UserActions";
import { formatDegreeCourse } from "@/lib/academic";
import {
  getAdminUserDetail,
  getUserAuditHistory,
  getUserPunches,
} from "@/lib/admin/queries";
import { formatRoleLabel } from "@/lib/admin/roles";
import { requireRole } from "@/lib/auth/session";
import {
  formatDocumentSerial,
  formatPunchDate,
  formatPunchTime,
} from "@/lib/punches/format";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireRole(["admin"]);
  const { id } = await params;

  // El id de la URL nunca autoriza por sí solo: se relee siempre de BD
  // antes de mostrar u ofrecer ninguna acción (Fase 6.0 §13, IDOR).
  const target = await getAdminUserDetail(id);
  if (!target) notFound();

  const [punches, auditHistory] = await Promise.all([
    target.role === "student" ? getUserPunches(target.id) : Promise.resolve([]),
    getUserAuditHistory(target.id),
  ]);

  const group = formatDegreeCourse(target.degree, target.course);

  // Fase 6.1.1: el "expediente" pasa a usar el mismo patrón de documento
  // que ya establece /cuenta (caja con borde, filas separadas por líneas
  // discontinuas) en vez de un encabezado suelto de ficha de perfil — y
  // gana una referencia documental (mismo formato que el ticket de
  // fichaje) para reforzar que esto es un archivo, no un panel de ajustes.
  const fields: { label: string; value: React.ReactNode }[] = [
    { label: "Email", value: target.email },
    { label: "Rol", value: formatRoleLabel(target.role) },
    ...(group ? [{ label: "Grado y curso", value: group }] : []),
    { label: "Estado", value: <ActiveMark active={target.active} /> },
    { label: "Alta", value: formatPunchDate(target.created_at) },
  ];

  return (
    <div>
      <Link
        href="/admin/usuarios"
        className="font-mono text-xs uppercase tracking-wide text-ink-dim underline decoration-line-strong underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
      >
        ← Usuarios
      </Link>

      <div className="mt-4">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
          Expediente
        </span>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">{target.name}</h1>
        <p className="mt-1 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-faint">
          {formatDocumentSerial("EXP", target.created_at, target.id)}
        </p>
      </div>

      <div className="mt-6 border border-ink bg-paper-raised">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex items-center justify-between gap-4 border-b border-dashed border-line px-6 py-4 last:border-b-0"
          >
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
              {field.label}
            </span>
            <span className="text-sm font-semibold text-ink">{field.value}</span>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
          Acciones
        </h2>
        <div className="mt-4">
          <UserActions target={target} isSelf={target.id === actor.id} />
        </div>
      </section>

      {target.role === "student" && (
        <section className="mt-10">
          <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
            Últimos fichajes
          </h2>
          {punches.length === 0 ? (
            <p className="border-t border-ink py-8 text-sm text-ink-dim">
              Todavía no hay fichajes registrados.
            </p>
          ) : (
            <div className="border-t border-ink">
              {punches.map((punch) => (
                <div
                  key={punch.id}
                  className="flex items-center justify-between gap-4 border-b border-dashed border-line py-3 font-mono text-sm last:border-b-0"
                >
                  <span className={punch.type === "IN" ? "text-ink" : "text-ink-faint"}>
                    {punch.type === "IN" ? "Entrada" : "Salida"}
                  </span>
                  <span className="text-ink-faint">{formatPunchDate(punch.timestamp)}</span>
                  <span className="text-ink-dim">{formatPunchTime(punch.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
          Auditoría de este usuario
        </h2>
        <AuditLogTable entries={auditHistory} />
      </section>
    </div>
  );
}
