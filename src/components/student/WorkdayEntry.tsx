import { formatPunchDate, formatPunchTime } from "@/lib/punches/format";
import { formatDuration, workdayDurationMs, type Workday } from "@/lib/punches/workday";

// Sin JS: <details>/<summary> dan el "seleccionar para ver el detalle" de
// forma nativa, accesible por teclado, sin necesitar un Client Component.
export function WorkdayEntry({ workday }: { workday: Workday }) {
  const durationMs = workdayDurationMs(workday);
  const incomplete = workday.checkOut === null;

  return (
    <details className="border-b border-dashed border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 font-mono text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp [&::-webkit-details-marker]:hidden">
        <span className="text-ink-faint">{formatPunchDate(workday.checkIn)}</span>
        <span className="flex items-center gap-3">
          <span className="text-ink">
            {formatPunchTime(workday.checkIn)} →{" "}
            {incomplete ? "en curso" : formatPunchTime(workday.checkOut as string)}
          </span>
          {incomplete && (
            <span className="border border-danger px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-danger">
              Sin salida
            </span>
          )}
        </span>
      </summary>
      <div className="grid grid-cols-3 gap-4 border-t border-dashed border-line px-1 pb-4 pt-3 font-mono text-xs">
        <div>
          <div className="uppercase tracking-wide text-ink-faint">Entrada</div>
          <div className="mt-1 text-sm text-ink">{formatPunchTime(workday.checkIn)}</div>
        </div>
        <div>
          <div className="uppercase tracking-wide text-ink-faint">Salida</div>
          <div className="mt-1 text-sm text-ink">
            {incomplete ? "-" : formatPunchTime(workday.checkOut as string)}
          </div>
        </div>
        <div>
          <div className="uppercase tracking-wide text-ink-faint">Duración</div>
          <div className="mt-1 text-sm text-ink">
            {durationMs !== null ? formatDuration(durationMs) : "-"}
          </div>
        </div>
      </div>
    </details>
  );
}
