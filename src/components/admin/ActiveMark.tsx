// Mismo patrón que StatusMark (src/components/staff/StatusMark.tsx): nunca
// solo color — el punto es apoyo visual, la palabra es la que informa
// realmente (Fase 6.1 §4/§30, accesibilidad).
export function ActiveMark({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em]">
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-stamp" : "bg-ink-faint"}`}
      />
      <span className={active ? "text-ink" : "text-ink-faint"}>
        {active ? "Activo" : "Inactivo"}
      </span>
    </span>
  );
}
