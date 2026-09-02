import { formatAuditAction, type AuditLogEntry } from "@/lib/admin/queries";
import { formatRoleLabel } from "@/lib/admin/roles";
import { formatDocumentSerial, formatPunchDate, formatPunchTime } from "@/lib/punches/format";
import type { Json, UserRole } from "@/types";

const KNOWN_ROLES = new Set<UserRole>(["student", "teacher", "admin"]);

function roleLabelOrRaw(value: Json | undefined): string {
  if (typeof value === "string" && KNOWN_ROLES.has(value as UserRole)) {
    return formatRoleLabel(value as UserRole);
  }
  return typeof value === "string" && value ? value : "-";
}

// Da a cada entrada un formato legible en vez de volcar el jsonb crudo:
// role_changed/user_created son, con diferencia, los eventos más
// frecuentes, así que reciben una frase propia (reutilizando las
// etiquetas de rol ya traducidas en roles.ts); cualquier otro valor cae en
// un volcado genérico clave: valor.
function formatMetadata(action: string, metadata: Json): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return "-";
  }
  const data = metadata as Record<string, Json>;

  if (action === "role_changed") {
    const from = roleLabelOrRaw(data.from);
    const to = roleLabelOrRaw(data.to);
    const reason = typeof data.reason === "string" && data.reason ? ` — ${data.reason}` : "";
    return `${from} → ${to}${reason}`;
  }

  if (action === "user_created") {
    const role = roleLabelOrRaw(data.role);
    const hasGroup = typeof data.degree === "string" && typeof data.course === "string";
    return hasGroup ? `${role} · ${data.degree} ${data.course}º` : role;
  }

  const entries = Object.entries(data).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
  if (entries.length === 0) return "-";
  return entries.map(([key, value]) => `${key}: ${value}`).join(" · ");
}

export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="border-t border-ink py-8 text-sm text-ink-dim">
        Todavía no hay acciones administrativas registradas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border-t border-ink">
      <table className="w-full min-w-[760px] border-collapse font-mono text-sm">
        <thead>
          <tr className="border-b border-dashed border-line text-left text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
            <th scope="col" className="py-3 pr-4 font-normal">
              Fecha
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              Actor
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              Acción
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              Objetivo
            </th>
            <th scope="col" className="py-3 pr-4 font-normal">
              IP
            </th>
            <th scope="col" className="py-3 font-normal">
              Detalle
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-dashed border-line align-top last:border-b-0"
            >
              <td className="whitespace-nowrap py-3 pr-4 text-ink-dim">
                <div>
                  {formatPunchDate(entry.createdAt)} · {formatPunchTime(entry.createdAt)}
                </div>
                <div className="mt-0.5 text-xs text-ink-faint">
                  {formatDocumentSerial("AUD", entry.createdAt, entry.id)}
                </div>
              </td>
              <td className="py-3 pr-4 text-ink">{entry.actorName}</td>
              <td className="py-3 pr-4 text-ink-dim">{formatAuditAction(entry.action)}</td>
              <td className="py-3 pr-4 text-ink-dim">{entry.targetName ?? "-"}</td>
              <td className="py-3 pr-4 text-ink-faint">{entry.ipAddress ?? "-"}</td>
              <td className="py-3 normal-case tracking-normal text-ink-faint">
                {formatMetadata(entry.action, entry.metadata)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
