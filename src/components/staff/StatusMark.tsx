import type { PunchState } from "@/lib/punches/state";

// Nunca solo color: el punto es apoyo visual, la palabra es la que informa
// realmente (accesibilidad, §19 de la Fase 5).
export function StatusMark({ state }: { state: PunchState }) {
  const working = state === "WORKING";

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em]">
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${working ? "bg-stamp" : "bg-ink-faint"}`}
      />
      <span className={working ? "text-ink" : "text-ink-faint"}>
        {working ? "En jornada" : "Fuera"}
      </span>
    </span>
  );
}
