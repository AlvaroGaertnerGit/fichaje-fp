import { formatPunchDate, formatPunchTime } from "@/lib/punches/format";
import type { ActivityEntry } from "@/lib/staff/queries";

export function ActivityLog({
  entries,
  showDate = false,
}: {
  entries: ActivityEntry[];
  showDate?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="border-t border-ink py-8 text-sm text-ink-dim">
        Todavía no hay fichajes registrados.
      </p>
    );
  }

  return (
    <div className="border-t border-ink">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between gap-4 border-b border-dashed border-line py-3 font-mono text-sm last:border-b-0"
        >
          <span className="text-ink">{entry.studentName}</span>
          <span className="text-ink-faint">{entry.academicGroup ?? "-"}</span>
          <span
            className={`ml-auto text-[0.6875rem] uppercase tracking-[0.14em] ${
              entry.type === "IN" ? "text-ink" : "text-ink-faint"
            }`}
          >
            {entry.type === "IN" ? "Entrada" : "Salida"}
          </span>
          {showDate && (
            <span className="text-ink-faint">
              {formatPunchDate(entry.timestamp)}
            </span>
          )}
          <span className="text-ink-dim">
            {formatPunchTime(entry.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}
