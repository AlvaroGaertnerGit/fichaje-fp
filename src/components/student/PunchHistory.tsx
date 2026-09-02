import type { Workday } from "@/lib/punches/workday";

import { WorkdayEntry } from "./WorkdayEntry";

export function PunchHistory({ workdays }: { workdays: Workday[] }) {
  if (workdays.length === 0) {
    return (
      <div className="border-t border-ink py-14 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-faint">
          El archivo está vacío
        </p>
        <p className="mt-2 text-sm text-ink-dim">Todavía no tienes jornadas registradas.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-ink">
      {workdays.map((w) => (
        <WorkdayEntry key={w.checkIn} workday={w} />
      ))}
    </div>
  );
}
