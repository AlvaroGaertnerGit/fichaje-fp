import { COURSES, DEGREES } from "@/lib/academic";

const ROLE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "student", label: "Alumno" },
  { value: "teacher", label: "Profesor" },
  { value: "admin", label: "Admin" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
] as const;

const DEGREE_OPTIONS = [{ value: "all", label: "Todos" }, ...DEGREES] as const;
const COURSE_OPTIONS = [{ value: "all", label: "Todos" }, ...COURSES] as const;

function FilterSelect({
  id,
  label,
  defaultValue,
  options,
}: {
  id: string;
  label: string;
  defaultValue: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint"
      >
        {label}
      </label>
      <select
        id={id}
        name={id}
        defaultValue={defaultValue}
        className="border border-line-strong bg-paper-raised px-3.5 py-2.5 font-mono text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-stamp"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Filtros como formulario GET sin JS (mismo patrón que /alumnos): la
// selección viaja en la propia URL, ningún estado de cliente que
// sincronizar. Solo se pueden alimentar con datos reales — grado/curso
// reutilizan src/lib/academic.ts, la misma fuente que /registro (Fase 6.1
// §5).
export function AdminUserFilters({
  filters,
}: {
  filters: { q?: string; role?: string; status?: string; degree?: string; course?: string };
}) {
  return (
    <form method="get" className="mt-6 flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="q"
          className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint"
        >
          Buscar
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder="Nombre o email"
          className="border border-line-strong bg-paper-raised px-3.5 py-2.5 font-mono text-sm text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-stamp"
        />
      </div>
      <FilterSelect id="role" label="Rol" defaultValue={filters.role ?? "all"} options={ROLE_OPTIONS} />
      <FilterSelect
        id="status"
        label="Estado"
        defaultValue={filters.status ?? "all"}
        options={STATUS_OPTIONS}
      />
      <FilterSelect
        id="degree"
        label="Grado"
        defaultValue={filters.degree ?? "all"}
        options={DEGREE_OPTIONS}
      />
      <FilterSelect
        id="course"
        label="Curso"
        defaultValue={filters.course ?? "all"}
        options={COURSE_OPTIONS}
      />
      <button
        type="submit"
        className="border border-line-strong bg-transparent px-4 py-2.5 font-mono text-sm font-semibold uppercase tracking-wide text-ink-dim transition-colors duration-150 ease-out hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
      >
        Filtrar
      </button>
    </form>
  );
}
